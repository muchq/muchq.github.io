import type { VoiceDevice } from './voiceMesh'

// The browser behind a room's voice. The microphone asks for the voice
// processing a call wants; a denial, an insecure origin or no device at
// all is null, which the mesh takes as listening only.
//
// Peers play through one AudioContext, resumed while the Join click is
// still a user gesture: a peer's audio arrives later, when an element's
// play() would be refused by autoplay rules (Safari, iOS, and anywhere
// the mic was denied). Chrome feeds a remote stream to Web Audio only
// while a media element plays it too, so each peer also has one, muted,
// which autoplays everywhere.

let context: AudioContext | null = null
const players = new Map<string, { element: HTMLAudioElement; source: MediaStreamAudioSourceNode }>()

export const browserVoiceDevice: VoiceDevice = {
  unlock() {
    context ??= new AudioContext()
    context.resume().catch(() => {})
  },

  async microphone() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
    } catch {
      return null
    }
  },

  peer: config => new RTCPeerConnection(config),

  play(peerId, stream) {
    const playing = players.get(peerId)
    if (playing !== undefined) {
      playing.source.disconnect()
      playing.element.srcObject = null
      players.delete(peerId)
    }
    if (stream === null || context === null) return
    const element = new Audio()
    element.muted = true
    element.srcObject = stream
    element.play().catch(() => {})
    const source = context.createMediaStreamSource(stream)
    source.connect(context.destination)
    players.set(peerId, { element, source })
  }
}
