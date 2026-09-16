import type { DejaEvent, DejaState } from '../types'

// Verbatim from the Rust wire test (MoonBase deja, Phase 2): keys and
// their order are the contract. Do not reformat.
export const PINNED_EVENT_JSON =
  '{"seq":2,"ts":1789500001.5,"lane":0,"step":0,"context":["api.muchq.com GET /iili/v1/r/* 302 browser"],"actual":"api.muchq.com GET /iili/v1/r/* 302 browser","predictions":{"bigram":[],"net":null},"surprise":{"bigram":1.0986122886681098,"net":null},"threshold":null,"verdict":"warmup","ewma_loss":{"bigram":0.0,"net":null},"vocab_size":3}'

export const PINNED_STATE_JSON =
  '{"seq":2,"step":1,"vocab_size":3,"vocab_cap":2048,"warmup_needed":1000,"ewma_loss":{"bigram":1.0986122886681098,"net":null},"threshold":null,"anomalies":0,"novelties":1}'

export const TOKENS = {
  home: 'muchq.com GET / 200 browser',
  stats: 'api.muchq.com GET /stats/v1/summary 200 browser',
  iili: 'api.muchq.com GET /iili/v1/r/* 302 browser',
  probe: 'muchq.com GET /.env 403 bot',
  weird: 'muchq.com POST /wp-login.php 404 other',
}

const base: DejaEvent = {
  seq: 1,
  ts: 1789500000,
  lane: 0,
  step: 1500,
  context: [TOKENS.home, TOKENS.stats],
  actual: TOKENS.iili,
  predictions: {
    bigram: [
      { token: TOKENS.iili, p: 0.6 },
      { token: TOKENS.home, p: 0.2 },
      { token: TOKENS.stats, p: 0.1 },
      { token: TOKENS.probe, p: 0.05 },
      { token: TOKENS.weird, p: 0.05 },
    ],
    net: null,
  },
  surprise: { bigram: 0.51, net: null },
  threshold: 4.0,
  verdict: 'expected',
  ewma_loss: { bigram: 1.2, net: null },
  vocab_size: 5,
}

// A past-warmup event, judged against a live threshold. Overrides are
// shallow; pass whole `predictions`/`surprise` objects to change those.
export const eventOf = (overrides: Partial<DejaEvent> = {}): DejaEvent => ({ ...base, ...overrides })

// One event per outcome the tape colours. Seqs ascend so the set can be
// applied in order and read back newest-first.
export const warmupEvent = eventOf({
  seq: 10,
  step: 3,
  threshold: null,
  verdict: 'warmup',
  actual: TOKENS.weird,
  // High surprise during warmup is still not an anomaly: no threshold yet.
  surprise: { bigram: 9.5, net: null },
  predictions: { bigram: [], net: null },
})

export const hitEvent = eventOf({ seq: 11, actual: TOKENS.iili })

export const nearEvent = eventOf({ seq: 12, actual: TOKENS.stats, surprise: { bigram: 2.3, net: null } })

// Outside the top-5 but under the threshold: expected, and never red.
export const missEvent = eventOf({
  seq: 13,
  actual: 'muchq.com GET /tracy 200 browser',
  surprise: { bigram: 3.9, net: null },
})

export const anomalyEvent = eventOf({
  seq: 14,
  actual: TOKENS.probe,
  context: [TOKENS.home, TOKENS.stats, TOKENS.iili],
  predictions: {
    bigram: [
      { token: TOKENS.iili, p: 0.9 },
      { token: TOKENS.home, p: 0.1 },
    ],
    net: null,
  },
  surprise: { bigram: 7.2, net: null },
  verdict: 'anomaly',
})

export const novelEvent = eventOf({
  seq: 15,
  actual: 'muchq.com GET /never-before 404 bot',
  predictions: { bigram: [], net: null },
  surprise: { bigram: 8.1, net: null },
  verdict: 'novel',
})

// What Phase 3 will send once the net predicts too.
export const netEvent = eventOf({
  seq: 16,
  actual: TOKENS.home,
  predictions: {
    bigram: [
      { token: TOKENS.home, p: 0.5 },
      { token: TOKENS.iili, p: 0.3 },
    ],
    net: [
      { token: TOKENS.iili, p: 0.55 },
      { token: TOKENS.home, p: 0.4 },
    ],
  },
  surprise: { bigram: 0.69, net: 0.92 },
  ewma_loss: { bigram: 1.1, net: 1.4 },
})

export const oneOfEach: DejaEvent[] = [warmupEvent, hitEvent, nearEvent, missEvent, anomalyEvent, novelEvent]

export const stateOf = (overrides: Partial<DejaState> = {}): DejaState => ({
  ...(JSON.parse(PINNED_STATE_JSON) as DejaState),
  ...overrides,
})
