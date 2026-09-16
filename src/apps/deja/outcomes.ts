import type { Outcome } from './tape'
import { TAPE_ROWS } from './tape'

// Shared order and blurbs for the tape legend. Row labels are the outcome
// id itself, so the key and each row cannot drift.
export const OUTCOME_ORDER: Outcome[] = ['hit', 'near', 'miss', 'anomaly', 'novel', 'warmup']

export const OUTCOME_BLURB: Record<Outcome, string> = {
  hit: 'expected; bigram’s top guess matched',
  near: 'expected; actual was in bigram’s top guesses',
  miss: 'expected; actual wasn’t in the top list',
  anomaly: 'surprise past the threshold',
  novel: 'token never seen before',
  warmup: 'still calibrating; no threshold yet',
}

export const TAPE_BOUND_NOTE = `Newest ${TAPE_ROWS} scored requests.`
