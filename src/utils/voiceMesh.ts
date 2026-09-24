// A room's voice (MoonBase#1590): a full WebRTC mesh between the people
// in voice, audio only. The hub carries none of the media; it keeps who
// is in voice and relays each negotiation signal, in order, to the one
// peer it names.
//
// Who offers: the joiner, to each member on its roster; a member answers
// and never offers to a joiner, so its peer connection is made when the
// joiner's offer arrives. Anything after that is perfect negotiation,
// the smaller playerId the polite peer. Every join is a new epoch, and a
// signal names its peer's, so one meant for a join that has since left
// is refused by the hub rather than landing on the next one.
//
// The hub answers in order but names no attempt: a join is answered by
// a roster or by one of the join's own refusals, and nothing says which
// join. So at most one join is out at a time. Leaving before its roster
// leaves once the roster is in, and joining again before then takes that
// roster as its own, since the hub never heard the leave.

export type VoiceAction = 'join' | 'leave' | 'signal'

// The hub's refusals of a join (voice.cc); any other refusal is some
// other command's. A rate-limited join is refused as "slow down", which
// chat is too, so that one leaves the join looking out until Leave.
const JOIN_REFUSALS = new Set(['voice is full', 'already in voice', 'join a room first'])

// The slice of RTCPeerConnection the mesh uses, so tests can stand in.
export interface VoicePeer {
  readonly signalingState: RTCSignalingState
  readonly localDescription: RTCSessionDescriptionInit | null
  onnegotiationneeded: ((event: Event) => void) | null
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null
  ontrack: ((event: RTCTrackEvent) => void) | null
  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender
  addTransceiver(kind: string, init?: RTCRtpTransceiverInit): RTCRtpTransceiver
  setLocalDescription(): Promise<void>
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>
  close(): void
}

// The browser's side: playback unlocked while the join's gesture is
// live, the microphone (null when denied or absent), a peer connection,
// and somewhere to play a peer (null stops it).
export interface VoiceDevice {
  unlock(): void
  microphone(): Promise<MediaStream | null>
  peer(config: RTCConfiguration, peerId: string): VoicePeer
  play(peerId: string, stream: MediaStream | null): void
}

export interface VoiceView {
  status: 'off' | 'joining' | 'on'
  // Everyone else in voice, in the order they are known.
  members: readonly string[]
  muted: boolean
  // In voice without a microphone: hearing, not heard.
  listenOnly: boolean
}

// --- wire shapes (mirrors MoonBase's model/voice.smithy) ---

export interface VoiceDescription {
  type: 'offer' | 'answer'
  sdp: string
}

export interface VoiceMember {
  playerId: string
  epoch: number
}

export interface VoiceIceServer {
  urls: string[]
  username?: string
  credential?: string
}

export type VoiceUpdate =
  | { roster: { epoch: number; members: VoiceMember[]; iceServers: VoiceIceServer[] } }
  | { joined: VoiceMember }
  | { left: { playerId: string } }
  | { signal: { from: string; description?: VoiceDescription; candidate?: RTCIceCandidateInit } }

interface Link {
  peer: VoicePeer
  epoch: number
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  // This end's audio is on the connection: at once for the joiner, after
  // the offer for a member, so the member's addTrack rides the answer.
  attached: boolean
  // Signals apply one at a time: a candidate waits for the offer before it.
  queue: Promise<void>
}

const OFF: VoiceView = { status: 'off', members: [], muted: false, listenOnly: false }

export class VoiceMesh {
  private playerId = ''
  private current: VoiceView = OFF
  private readonly listeners = new Set<() => void>()
  private mic: MediaStream | null = null
  // Bumped by every teardown, so a join still waiting on the microphone
  // knows it was abandoned.
  private generation = 0
  // A join is out: the hub has not answered it yet.
  private outstanding = false
  // This end wants the answer: mic in hand, not left since.
  private awaitingRoster = false
  private iceServers: VoiceIceServer[] = []
  // Everyone else in voice and the join a signal to them names.
  private readonly epochs = new Map<string, number>()
  private readonly links = new Map<string, Link>()

  constructor(
    private readonly send: (action: VoiceAction, payload: unknown) => void,
    private readonly device: VoiceDevice
  ) {}

  view = (): VoiceView => this.current

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  sessionReady(playerId: string): void {
    this.playerId = playerId
  }

  // A user gesture: the microphone prompt, and the autoplay it unlocks.
  async join(): Promise<void> {
    if (this.current.status !== 'off') return
    this.device.unlock()
    const generation = this.generation
    this.update({ status: 'joining' })
    const mic = await this.device.microphone()
    if (generation !== this.generation) {
      mic?.getTracks().forEach(track => track.stop())
      return
    }
    this.mic = mic
    this.awaitingRoster = true
    this.update({ listenOnly: mic === null })
    if (this.outstanding) return
    this.outstanding = true
    this.send('join', {})
  }

  leave(): void {
    if (this.current.status === 'off') return
    const inVoice = this.current.status === 'on'
    this.teardown()
    if (inVoice) this.send('leave', {})
  }

  setMuted(muted: boolean): void {
    if (this.mic === null) return
    this.mic.getAudioTracks().forEach(track => (track.enabled = !muted))
    this.update({ muted })
  }

  // Any in-band refusal from the hub.
  rejected(reason: string): void {
    if (!this.outstanding || !JOIN_REFUSALS.has(reason)) return
    this.outstanding = false
    if (this.awaitingRoster) this.teardown()
  }

  // Out of voice without saying so: the room left, the socket dropped, a
  // new session. The hub has already taken this session out of voice,
  // and answers no join still out.
  dropped(): void {
    this.outstanding = false
    this.teardown()
  }

  private teardown(): void {
    this.generation += 1
    this.awaitingRoster = false
    for (const [peerId, link] of this.links) {
      link.peer.close()
      this.device.play(peerId, null)
    }
    this.links.clear()
    this.epochs.clear()
    this.mic?.getTracks().forEach(track => track.stop())
    this.mic = null
    this.current = OFF
    this.changed()
  }

  apply(update: VoiceUpdate): void {
    if ('roster' in update) {
      if (!this.outstanding) return
      this.outstanding = false
      // Left, or not back from the mic yet: out again, and a rejoin
      // waiting on the mic sends its own join after this leave.
      if (!this.awaitingRoster) {
        this.send('leave', {})
        return
      }
      this.awaitingRoster = false
      this.iceServers = update.roster.iceServers
      for (const member of update.roster.members) {
        this.epochs.set(member.playerId, member.epoch)
        this.attach(this.connect(member.playerId, member.epoch))
      }
      this.update({ status: 'on', members: [...this.epochs.keys()] })
    } else if ('joined' in update) {
      if (this.current.status !== 'on') return
      const { playerId, epoch } = update.joined
      this.hangUp(playerId)
      this.epochs.set(playerId, epoch)
      this.update({ members: [...this.epochs.keys()] })
    } else if ('left' in update) {
      const { playerId } = update.left
      this.hangUp(playerId)
      if (this.epochs.delete(playerId)) this.update({ members: [...this.epochs.keys()] })
    } else if ('signal' in update) {
      this.receive(update.signal)
    }
  }

  // --- the mesh ---

  private connect(peerId: string, epoch: number): Link {
    const peer = this.device.peer({ iceServers: this.iceServers }, peerId)
    const link: Link = {
      peer,
      epoch,
      polite: this.playerId < peerId,
      makingOffer: false,
      ignoreOffer: false,
      attached: false,
      queue: Promise.resolve()
    }
    this.links.set(peerId, link)
    const live = () => this.links.get(peerId) === link
    peer.onnegotiationneeded = async () => {
      try {
        link.makingOffer = true
        await peer.setLocalDescription()
        if (live()) this.signal(peerId, link, { description: this.described(peer) })
      } catch (error) {
        console.error('voice: offer failed', error)
      } finally {
        link.makingOffer = false
      }
    }
    peer.onicecandidate = ({ candidate }) => {
      if (candidate !== null && live()) this.signal(peerId, link, { candidate: candidate.toJSON() })
    }
    peer.ontrack = ({ streams }) => {
      if (live() && streams[0] !== undefined) this.device.play(peerId, streams[0])
    }
    return link
  }

  private attach(link: Link): void {
    if (link.attached) return
    link.attached = true
    const tracks = this.mic?.getAudioTracks() ?? []
    if (tracks.length === 0) link.peer.addTransceiver('audio', { direction: 'recvonly' })
    for (const track of tracks) link.peer.addTrack(track, this.mic!)
  }

  private receive(signal: { from: string; description?: VoiceDescription; candidate?: RTCIceCandidateInit }): void {
    const epoch = this.epochs.get(signal.from)
    if (epoch === undefined) return
    const link = this.links.get(signal.from) ?? this.connect(signal.from, epoch)
    link.queue = link.queue.then(() => this.negotiate(signal.from, link, signal)).catch(error => {
      if (!link.ignoreOffer) console.error('voice: signal failed', error)
    })
  }

  private async negotiate(
    peerId: string,
    link: Link,
    { description, candidate }: { description?: VoiceDescription; candidate?: RTCIceCandidateInit }
  ): Promise<void> {
    if (this.links.get(peerId) !== link) return
    const { peer } = link
    if (description !== undefined) {
      const collision = description.type === 'offer' && (link.makingOffer || peer.signalingState !== 'stable')
      link.ignoreOffer = !link.polite && collision
      if (link.ignoreOffer) return
      await peer.setRemoteDescription(description)
      if (description.type !== 'offer') return
      this.attach(link)
      await peer.setLocalDescription()
      if (this.links.get(peerId) === link) this.signal(peerId, link, { description: this.described(peer) })
    } else if (candidate !== undefined) {
      // One for an offer this end ignored fails, and is dropped quietly.
      await peer.addIceCandidate(candidate)
    }
  }

  private described(peer: VoicePeer): VoiceDescription {
    const { type, sdp } = peer.localDescription!
    return { type: type as VoiceDescription['type'], sdp: sdp ?? '' }
  }

  private signal(peerId: string, link: Link, body: { description?: VoiceDescription; candidate?: RTCIceCandidateInit }): void {
    this.send('signal', { to: peerId, toEpoch: link.epoch, ...body })
  }

  private hangUp(peerId: string): void {
    const link = this.links.get(peerId)
    if (link === undefined) return
    link.peer.close()
    this.links.delete(peerId)
    this.device.play(peerId, null)
  }

  private update(patch: Partial<VoiceView>): void {
    this.current = { ...this.current, ...patch }
    this.changed()
  }

  private changed(): void {
    this.listeners.forEach(listener => listener())
  }
}
