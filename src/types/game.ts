// Game types and interfaces
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
  angle: number
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

export interface NetworkMessage {
  type: 'player_join' | 'player_leave' | 'position_update' | 'shape_update' | 'game_state'
  playerId: string
  position?: [number, number, number]
  color?: [number, number, number]
  shape?: ShapeType
  timestamp: number
  players?: Player[]
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

export interface NetworkManager {
  ws: WebSocket | null
  isConnected: boolean
  isSimulated: boolean
  lastSentPosition: [number, number, number] | null
  positionUpdateThrottle: number
  lastPositionSent: number
  
  connect(url?: string): void
  disconnect(): void
  sendMessage(message: NetworkMessage): void
  sendPositionUpdate(position: [number, number, number]): void
  sendPlayerJoin(): void
}

export interface BotPlayer {
  id: string
  position: [number, number, number]
  color: [number, number, number]
  velocity: [number, number, number]
  direction: number
  speed: number
  directionChangeTimer: number
}

export interface FakeServer {
  players: Map<string, BotPlayer>
  isRunning: boolean
  updateInterval: number | null
  botPlayers: BotPlayer[]
  stateUpdateFrequency: number
  
  start(): void
  stop(): void
  createBotPlayers(count: number): void
  updateBotPositions(): void
  sendStateUpdate(): void
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