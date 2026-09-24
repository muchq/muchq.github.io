import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VoiceMesh } from '../voiceMesh'
import type { VoiceAction } from '../voiceMesh'
import { FakeVoiceDevice } from '@/test/fakeVoice'
import { flushAsync } from '@/test/fakeHub'

// A room's voice against a fake WebRTC: who offers to whom, the signals
// the hub relays and the epochs they name, and everything a leave, a
// drop or a refusal tears down.

const STUN = [{ urls: ['stun:stun.example:3478'] }]

type Sent = { action: VoiceAction; payload: Record<string, unknown> }

describe('VoiceMesh', () => {
  let device: FakeVoiceDevice
  let sent: Sent[]
  let mesh: VoiceMesh

  const make = (playerId: string, fake = new FakeVoiceDevice()) => {
    device = fake
    sent = []
    mesh = new VoiceMesh((action, payload) => sent.push({ action, payload: payload as Record<string, unknown> }), device)
    mesh.sessionReady(playerId)
  }

  const signals = () => sent.filter(s => s.action === 'signal').map(s => s.payload)

  // alice joins a voice bob and carol are already in.
  const joinAsAlice = async (members = [{ playerId: 'bob', epoch: 4 }, { playerId: 'carol', epoch: 5 }]) => {
    await mesh.join()
    mesh.apply({ roster: { epoch: 6, members, iceServers: STUN } })
    await flushAsync()
  }

  beforeEach(() => make('alice'))

  it('asks for the microphone, then joins', async () => {
    const joining = mesh.join()
    expect(mesh.view().status).toBe('joining')
    await joining
    expect(sent).toEqual([{ action: 'join', payload: {} }])
  })

  it('the joiner offers to everyone on its roster, over the roster’s ICE servers', async () => {
    await joinAsAlice()
    expect(mesh.view()).toEqual({ status: 'on', members: ['bob', 'carol'], muted: false, listenOnly: false })
    for (const peerId of ['bob', 'carol']) {
      const peer = device.peers.get(peerId)!
      expect(peer.config).toEqual({ iceServers: STUN })
      expect(peer.tracks).toEqual([device.mic])
    }
    expect(signals()).toEqual([
      { to: 'bob', toEpoch: 4, description: { type: 'offer', sdp: 'offer 1 to bob' } },
      { to: 'carol', toEpoch: 5, description: { type: 'offer', sdp: 'offer 1 to carol' } }
    ])
  })

  it('applies the answer, and plays what the peer sends', async () => {
    await joinAsAlice([{ playerId: 'bob', epoch: 4 }])
    mesh.apply({ signal: { from: 'bob', description: { type: 'answer', sdp: 'a' } } })
    await flushAsync()
    const peer = device.peers.get('bob')!
    expect(peer.signalingState).toBe('stable')
    const stream = {} as MediaStream
    peer.hear(stream)
    expect(device.playing.get('bob')).toBe(stream)
  })

  it('a member answers a joiner and never offers to one', async () => {
    make('bob')
    await mesh.join()
    mesh.apply({ roster: { epoch: 4, members: [], iceServers: STUN } })
    mesh.apply({ joined: { playerId: 'alice', epoch: 6 } })
    expect(mesh.view().members).toEqual(['alice'])
    await flushAsync()
    expect(device.peers.size).toBe(0)

    mesh.apply({ signal: { from: 'alice', description: { type: 'offer', sdp: 'o' } } })
    await flushAsync()
    const peer = device.peers.get('alice')!
    expect(peer.tracks).toEqual([device.mic])
    expect(signals()).toEqual([{ to: 'alice', toEpoch: 6, description: { type: 'answer', sdp: 'answer to alice' } }])
  })

  it('trickles candidates both ways, a candidate hard on its offer’s heels included', async () => {
    make('bob')
    await mesh.join()
    mesh.apply({ roster: { epoch: 4, members: [], iceServers: STUN } })
    mesh.apply({ joined: { playerId: 'alice', epoch: 6 } })
    // The hub relays in order, and the candidate lands before the offer
    // has been applied: it waits its turn rather than failing.
    mesh.apply({ signal: { from: 'alice', description: { type: 'offer', sdp: 'o' } } })
    mesh.apply({ signal: { from: 'alice', candidate: { candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 } } })
    await flushAsync()
    const peer = device.peers.get('alice')!
    expect(peer.candidates).toEqual([{ candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 }])

    peer.gather({ candidate: 'candidate:2', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'u' })
    expect(signals().at(-1)).toEqual({
      to: 'alice',
      toEpoch: 6,
      candidate: { candidate: 'candidate:2', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'u' }
    })
  })

  it('ignores a signal from someone it has no join for', async () => {
    make('bob')
    await mesh.join()
    mesh.apply({ roster: { epoch: 4, members: [], iceServers: STUN } })
    mesh.apply({ signal: { from: 'mallory', description: { type: 'offer', sdp: 'o' } } })
    await flushAsync()
    expect(device.peers.size).toBe(0)
    expect(signals()).toEqual([])
  })

  it('a peer who leaves is hung up and goes quiet', async () => {
    await joinAsAlice()
    device.peers.get('bob')!.hear({} as MediaStream)
    mesh.apply({ left: { playerId: 'bob' } })
    expect(device.peers.get('bob')!.closed).toBe(true)
    expect(device.playing.has('bob')).toBe(false)
    expect(mesh.view().members).toEqual(['carol'])
  })

  it('a later join from the same player is a new peer, addressed by its new epoch', async () => {
    make('bob')
    await mesh.join()
    mesh.apply({ roster: { epoch: 4, members: [], iceServers: STUN } })
    mesh.apply({ joined: { playerId: 'alice', epoch: 6 } })
    mesh.apply({ signal: { from: 'alice', description: { type: 'offer', sdp: 'o' } } })
    await flushAsync()
    const first = device.peers.get('alice')!
    mesh.apply({ left: { playerId: 'alice' } })
    mesh.apply({ joined: { playerId: 'alice', epoch: 9 } })
    mesh.apply({ signal: { from: 'alice', description: { type: 'offer', sdp: 'o2' } } })
    await flushAsync()
    expect(device.peers.get('alice')).not.toBe(first)
    expect(signals().at(-1)).toMatchObject({ to: 'alice', toEpoch: 9, description: { type: 'answer' } })
  })

  it('with the microphone denied, listens: it still offers, to receive only', async () => {
    make('alice', new FakeVoiceDevice(true))
    await joinAsAlice([{ playerId: 'bob', epoch: 4 }])
    expect(mesh.view()).toMatchObject({ status: 'on', listenOnly: true })
    const peer = device.peers.get('bob')!
    expect(peer.tracks).toEqual([])
    expect(peer.transceivers).toEqual([{ kind: 'audio', init: { direction: 'recvonly' } }])
    expect(signals()).toEqual([{ to: 'bob', toEpoch: 4, description: { type: 'offer', sdp: 'offer 1 to bob' } }])
  })

  it('mutes by silencing the track, with nothing to renegotiate', async () => {
    await joinAsAlice([{ playerId: 'bob', epoch: 4 }])
    const before = sent.length
    mesh.setMuted(true)
    expect(device.mic!.enabled).toBe(false)
    expect(mesh.view().muted).toBe(true)
    mesh.setMuted(false)
    expect(device.mic!.enabled).toBe(true)
    await flushAsync()
    expect(sent.length).toBe(before)
  })

  it('leaving says so, hangs up everyone and lets go of the microphone', async () => {
    await joinAsAlice()
    mesh.leave()
    expect(sent.at(-1)).toEqual({ action: 'leave', payload: {} })
    expect([...device.peers.values()].every(peer => peer.closed)).toBe(true)
    expect(device.mic!.stopped).toBe(true)
    expect(mesh.view()).toEqual({ status: 'off', members: [], muted: false, listenOnly: false })
  })

  it('a drop tears down the same, and sends nothing: the hub already left us', async () => {
    await joinAsAlice()
    const before = sent.length
    mesh.dropped()
    expect(sent.length).toBe(before)
    expect([...device.peers.values()].every(peer => peer.closed)).toBe(true)
    expect(device.mic!.stopped).toBe(true)
    expect(mesh.view().status).toBe('off')
  })

  it('a drop while the microphone prompt is up joins nothing, and releases the mic when it comes', async () => {
    device.hold()
    const joining = mesh.join()
    mesh.dropped()
    device.release()
    await joining
    expect(sent).toEqual([])
    expect(device.mic!.stopped).toBe(true)
    expect(mesh.view().status).toBe('off')
  })

  it('unlocks playback inside the join’s gesture, before the microphone prompt', () => {
    device.hold()
    void mesh.join()
    expect(device.unlocked).toBe(1)
  })

  it('a refusal of the join turns voice back off', async () => {
    await mesh.join()
    mesh.rejected('voice is full')
    expect(mesh.view().status).toBe('off')
    expect(device.mic!.stopped).toBe(true)
  })

  it('a refusal of something else, while the join is out, leaves the join alone', async () => {
    await mesh.join()
    mesh.rejected('chat is too long')
    expect(mesh.view().status).toBe('joining')
    mesh.apply({ roster: { epoch: 6, members: [{ playerId: 'bob', epoch: 4 }], iceServers: STUN } })
    await flushAsync()
    expect(mesh.view()).toMatchObject({ status: 'on', members: ['bob'] })
  })

  it('a refusal once in voice is someone else’s business', async () => {
    await joinAsAlice()
    mesh.rejected('voice is full')
    expect(mesh.view().status).toBe('on')
  })

  describe('one join out at a time, since the hub answers in order and names no attempt', () => {
    it('leaving before the roster leaves once the roster is in', async () => {
      await mesh.join()
      mesh.leave()
      expect(mesh.view().status).toBe('off')
      expect(sent).toEqual([{ action: 'join', payload: {} }])
      mesh.apply({ roster: { epoch: 6, members: [{ playerId: 'bob', epoch: 4 }], iceServers: STUN } })
      await flushAsync()
      expect(sent).toEqual([
        { action: 'join', payload: {} },
        { action: 'leave', payload: {} }
      ])
      expect(device.peers.size).toBe(0)
      expect(mesh.view().status).toBe('off')
    })

    it('rejoining before that roster takes it as its own: the hub never heard the leave', async () => {
      await mesh.join()
      mesh.leave()
      await mesh.join()
      expect(sent).toEqual([{ action: 'join', payload: {} }])
      mesh.apply({ roster: { epoch: 6, members: [{ playerId: 'bob', epoch: 4 }], iceServers: STUN } })
      await flushAsync()
      expect(mesh.view()).toMatchObject({ status: 'on', members: ['bob'] })
      expect(device.peers.get('bob')!.tracks).toEqual([device.mic])
    })

    it('a roster that lands while the rejoin waits on the mic is left, and the rejoin joins after it', async () => {
      await mesh.join()
      mesh.leave()
      device.hold()
      const rejoining = mesh.join()
      mesh.apply({ roster: { epoch: 6, members: [], iceServers: STUN } })
      expect(sent.map(s => s.action)).toEqual(['join', 'leave'])
      device.release()
      await rejoining
      expect(sent.map(s => s.action)).toEqual(['join', 'leave', 'join'])
      mesh.apply({ roster: { epoch: 7, members: [{ playerId: 'bob', epoch: 4 }], iceServers: STUN } })
      await flushAsync()
      expect(mesh.view()).toMatchObject({ status: 'on', members: ['bob'] })
    })

    it('a drop clears the way too: the hub answers no join from a dead session', async () => {
      await mesh.join()
      mesh.dropped()
      await mesh.join()
      expect(sent.map(s => s.action)).toEqual(['join', 'join'])
    })

    it('a refused join clears the way for the next', async () => {
      await mesh.join()
      mesh.leave()
      mesh.rejected('voice is full')
      await mesh.join()
      expect(sent.map(s => s.action)).toEqual(['join', 'join'])
    })
  })

  describe('glare, which perfect negotiation settles', () => {
    // Both ends offering at once: a renegotiation crossing another.
    const crossedOffers = async (me: string, them: string) => {
      make(me)
      await mesh.join()
      mesh.apply({ roster: { epoch: 1, members: [{ playerId: them, epoch: 2 }], iceServers: STUN } })
      await flushAsync()
      expect(device.peers.get(them)!.signalingState).toBe('have-local-offer')
      mesh.apply({ signal: { from: them, description: { type: 'offer', sdp: `offer from ${them}` } } })
      await flushAsync()
      return device.peers.get(them)!
    }

    it('the polite peer (the smaller id) yields and answers', async () => {
      const peer = await crossedOffers('alice', 'bob')
      expect(peer.remoteDescription).toEqual({ type: 'offer', sdp: 'offer from bob' })
      expect(signals().at(-1)).toMatchObject({ to: 'bob', description: { type: 'answer' } })
    })

    it('the impolite peer ignores the crossing offer, and its candidates', async () => {
      const peer = await crossedOffers('bob', 'alice')
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
      mesh.apply({ signal: { from: 'alice', candidate: { candidate: 'candidate:9' } } })
      await flushAsync()
      expect(peer.remoteDescription).toBeNull()
      expect(peer.candidates).toEqual([])
      expect(signals().filter(s => (s.description as { type: string } | undefined)?.type === 'answer')).toEqual([])
      expect(errors).not.toHaveBeenCalled()
    })
  })
})
