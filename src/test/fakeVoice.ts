import { vi } from 'vitest'
import type { VoiceDevice, VoicePeer, VoiceView } from '@/utils/voiceMesh'

// WebRTC without a browser: a peer connection that keeps the signaling
// state machine (offer, answer, the implicit rollback a polite peer
// takes on glare) and fires negotiationneeded the way browsers do, and
// a microphone that is a stream of one fake track, or a denial.

export class FakeTrack {
  enabled = true
  stopped = false
  stop(): void {
    this.stopped = true
  }
}

export class FakePeer implements VoicePeer {
  signalingState: RTCSignalingState = 'stable'
  localDescription: RTCSessionDescriptionInit | null = null
  remoteDescription: RTCSessionDescriptionInit | null = null
  tracks: FakeTrack[] = []
  transceivers: { kind: string; init: RTCRtpTransceiverInit }[] = []
  candidates: RTCIceCandidateInit[] = []
  closed = false
  onnegotiationneeded: ((event: Event) => void) | null = null
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  private offers = 0

  constructor(
    readonly config: RTCConfiguration,
    private readonly name: string
  ) {}

  addTrack(track: MediaStreamTrack): RTCRtpSender {
    this.tracks.push(track as unknown as FakeTrack)
    this.changed()
    return {} as RTCRtpSender
  }

  addTransceiver(kind: string, init: RTCRtpTransceiverInit): RTCRtpTransceiver {
    this.transceivers.push({ kind, init })
    this.changed()
    return {} as RTCRtpTransceiver
  }

  async setLocalDescription(): Promise<void> {
    await Promise.resolve()
    if (this.signalingState === 'have-remote-offer') {
      this.localDescription = { type: 'answer', sdp: `answer to ${this.name}` }
      this.signalingState = 'stable'
    } else {
      this.offers += 1
      this.localDescription = {
        type: 'offer',
        sdp: `offer ${this.offers} to ${this.name}`
      }
      this.signalingState = 'have-local-offer'
    }
  }

  // Slower than a candidate, as a real one is: a candidate that does not
  // wait its turn finds no remote description.
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
    if (description.type === 'answer' && this.signalingState !== 'have-local-offer') {
      throw new Error(`answer in ${this.signalingState}`)
    }
    this.remoteDescription = description
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable'
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await Promise.resolve()
    if (this.remoteDescription === null) throw new Error('candidate before a remote description')
    this.candidates.push(candidate)
  }

  close(): void {
    this.closed = true
  }

  // --- driven by the test ---

  gather(candidate: RTCIceCandidateInit): void {
    this.onicecandidate?.({
      candidate: { toJSON: () => candidate }
    } as unknown as RTCPeerConnectionIceEvent)
  }

  hear(stream: MediaStream): void {
    this.ontrack?.({ streams: [stream] } as unknown as RTCTrackEvent)
  }

  // Browsers queue negotiationneeded while a negotiation is under way and
  // drop it if the answer already covers the change; the fake only ever
  // needs the first half.
  private changed(): void {
    if (this.signalingState !== 'stable') return
    queueMicrotask(() => this.onnegotiationneeded?.(new Event('negotiationneeded')))
  }
}

export class FakeVoiceDevice implements VoiceDevice {
  peers = new Map<string, FakePeer>()
  playing = new Map<string, MediaStream>()
  mic: FakeTrack | null = new FakeTrack()
  // Resolves the pending microphone prompt; null until one is asked.
  private grant: (() => void) | null = null
  held = false

  constructor(readonly deny = false) {}

  microphone(): Promise<MediaStream | null> {
    if (this.deny) {
      this.mic = null
      return Promise.resolve(null)
    }
    const stream = {
      getTracks: () => [this.mic],
      getAudioTracks: () => [this.mic]
    } as unknown as MediaStream
    if (!this.held) return Promise.resolve(stream)
    return new Promise(resolve => {
      this.grant = () => resolve(stream)
    })
  }

  // The next prompt waits for release(), as a person deciding would.
  hold(): void {
    this.held = true
  }

  release(): void {
    this.grant?.()
  }

  // Playback unlocks this many times, each inside the join's gesture.
  unlocked = 0

  unlock(): void {
    this.unlocked += 1
  }

  peer(config: RTCConfiguration, peerId: string): VoicePeer {
    const peer = new FakePeer(config, peerId)
    this.peers.set(peerId, peer)
    return peer
  }

  play(peerId: string, stream: MediaStream | null): void {
    if (stream === null) this.playing.delete(peerId)
    else this.playing.set(peerId, stream)
  }
}

// The mesh as the lobby's UI sees it: a view that holds still (one
// object, as useSyncExternalStore needs), and the verbs as spies.
export const fakeVoiceMesh = (view: Partial<VoiceView> = {}) => {
  const snapshot: VoiceView = {
    status: 'off',
    members: [],
    muted: false,
    listenOnly: false,
    ...view
  }
  return {
    view: () => snapshot,
    subscribe: () => () => {},
    join: vi.fn(),
    leave: vi.fn(),
    setMuted: vi.fn()
  }
}
