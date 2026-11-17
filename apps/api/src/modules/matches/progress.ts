import type { InningsState, MatchStatus } from '@cricket/shared';
import { computeResult, type MatchResult } from '@cricket/engine';

export interface MatchProgress {
  status: MatchStatus;
  result: MatchResult | null;
}

/** Match status and result derived only from the innings states. Pure, so it is unit tested. */
export function deriveProgress(first: InningsState | null, second: InningsState | null): MatchProgress {
  if (!first) return { status: 'toss', result: null };
  if (!second) {
    return { status: first.status === 'completed' ? 'innings_break' : 'live', result: null };
  }
  const result = computeResult(first, second);
  return { status: result ? 'completed' : 'live', result };
}
