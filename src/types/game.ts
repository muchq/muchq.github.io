// Game types and interfaces
import type { TapeRing } from '@/utils/tapeSplats'

export interface GameConfig {
  moveSpeed: number
  worldBoundary: number
  rotateSpeed: number
  zoomSpeed: number
  bounceHeight: number
  bounceSpeed: number
  sphereRadius: number
  groundLevel: number
}

export interface Camera {
  distance: number
  height: number
}

export enum ShapeType {
  SPHERE = 0,
  CUBE = 1,
  PYRAMID = 2
}

export interface Player {
  id: string
  position: [number, number, number]
  color: [number, number, number]
  shape: ShapeType
  lastBounceTime: number
  
  updatePosition(newPosition: [number, number, number]): void
  getBouncingY(time: number): number
}

// One player as the hub's wire carries it (thoughts.smithy's WorldPlayer):
// in worldState's list and inside playerJoined.
export interface GameStatePlayer {
  playerId: string
  position: [number, number, number]
  color: [number, number, number]
  shape: ShapeType
}

export interface VirtualJoystickState {
  x: number // -1 to 1
  y: number // -1 to 1
  active: boolean
}

export interface AudioContextState {
  context: AudioContext | null
  soundEnabled: boolean
  backgroundMusic: {
    isPlaying: boolean
    gainNode: GainNode | null
    nextNoteTime: number
    tempo: number
    noteIndex: number
    chordIndex: number
  }
}

export interface GameState {
  players: Map<string, Player>
  localPlayerId: string | null
  camera: Camera
  // deja's tape, as the glasshouse's walls hold it: the hub places every
  // splat and this ring is all the client keeps of it.
  tape: TapeRing
  
  addPlayer(id: string, position: [number, number, number], color: [number, number, number], shape?: ShapeType): Player
  removePlayer(id: string): void
  updatePlayer(id: string, position: [number, number, number]): void
  getLocalPlayer(): Player | undefined
  getAllPlayers(): Player[]
}

export interface WebGLShaderProgram {
  program: WebGLProgram
  uniforms: {
    resolution: WebGLUniformLocation | null
    cameraPos: WebGLUniformLocation | null
    cameraTarget: WebGLUniformLocation | null
    time: WebGLUniformLocation | null
    worldBoundary: WebGLUniformLocation | null
    numObjects: WebGLUniformLocation | null
    objectCenters: WebGLUniformLocation | null
    objectColors: WebGLUniformLocation | null
    objectShapes: WebGLUniformLocation | null
  }
  attributes: {
    position: number
  }
  buffers: {
    position: WebGLBuffer | null
    vao: WebGLVertexArrayObject | null
  }
}

export interface MelodyPattern {
  notes: number[]
  chords: number[][]
}

export interface AudioSystem {
  audioContext: AudioContext | null
  soundEnabled: boolean
  backgroundMusic: {
    isPlaying: boolean
    gainNode: GainNode | null
    nextNoteTime: number
    tempo: number
    noteIndex: number
    chordIndex: number
  }
  lastBounceTime: number
  
  initAudioContext(): AudioContext | null
  startBackgroundMusic(): void
  stopBackgroundMusic(): void
  playBoingSound(): void
  toggleSound(): void
}