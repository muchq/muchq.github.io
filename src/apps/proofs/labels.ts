import type { ProblemKind } from './types'

export const KIND_LABEL: Record<ProblemKind, string> = {
  prove: 'Prove',
  decide: 'Prove or disprove',
  flaw: 'Find the flaw',
}
