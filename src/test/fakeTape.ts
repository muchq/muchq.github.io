import type { TapeSplat } from '@/utils/tapeSplats'

// One of the hub's tape splats (lobby.smithy's TapeSplat), with the
// required fields filled so a test names only what it is about.
export const splat = (over: Partial<TapeSplat> = {}): TapeSplat => ({
  seq: 1,
  wall: 0,
  u: 0.5,
  v: 0.5,
  ts: 1_700_000_000,
  context: ['GET /a', 'GET /b'],
  actual: 'GET /c',
  verdict: 'expected',
  bigram: { token: 'GET /c', p: 0.8 },
  ...over,
})
