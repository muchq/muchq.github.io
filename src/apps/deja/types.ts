// Wire shapes of the deja service (MoonBase#1150, Phase 2), the anomaly
// detector over the access-log token stream behind api.muchq.com/deja/v1.
// The Rust side pins one event in its wire test; the same JSON is the
// fixture in __tests__/fixtures.ts, so a shape drift there fails here.

export type Verdict = 'warmup' | 'expected' | 'anomaly' | 'novel'

// One of a predictor's likeliest next tokens, likeliest first.
export interface Prediction {
  token: string
  p: number
}

// Two predictors: the bigram table, and the net that lands with Phase 3.
// Every `net` field is null until then; afterwards the shapes mirror
// `bigram`.
export interface PerPredictor<T> {
  bigram: T
  net: T | null
}

// One scored request. `context` is the lane's last up-to-8 tokens, oldest
// first; `threshold`, `step` and `ewma_loss` are the baseline the verdict
// was judged against (threshold is null through the warmup, the first
// `warmup_needed` scored steps); `ts` is unix seconds; `lane` is a slot
// number, never an address.
export interface DejaEvent {
  seq: number
  ts: number
  lane: number
  step: number
  context: string[]
  actual: string
  predictions: PerPredictor<Prediction[]>
  surprise: PerPredictor<number>
  threshold: number | null
  verdict: Verdict
  ewma_loss: PerPredictor<number>
  vocab_size: number
}

// GET /state: where the detector is now.
export interface DejaState {
  seq: number
  step: number
  vocab_size: number
  vocab_cap: number
  warmup_needed: number
  ewma_loss: PerPredictor<number>
  threshold: number | null
  anomalies: number
  novelties: number
}

// POST /next (Phase 3): both predictors' top-5 for a caller-chosen context.
export interface NextResponse {
  predictions: PerPredictor<Prediction[]>
}
