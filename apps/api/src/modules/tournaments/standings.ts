import type { InningsState, MatchRules } from '@cricket/shared';
import type { InningsSummary, MatchOutcome } from '@cricket/engine';
import { asInnings } from '../../lib/json';

/** Plain shape of a finished match row. Kept independent of Prisma types so it is unit testable. */
export interface FinishedMatchRow {
  id: string;
  status: string;
  resultType: string | null;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  innings: { inningsNo: number; snapshot: unknown }[];
}

const summary = (s: InningsState): InningsSummary => ({
  teamId: s.battingTeamId,
  runs: s.runs,
  ballsFaced: s.legalBalls,
  allOut: s.completedReason === 'allOut',
});

/** Convert a stored match into the engine's MatchOutcome, or null if it does not count (yet). */
export function toOutcome(m: FinishedMatchRow, rules: MatchRules): MatchOutcome | null {
  if (!m.teamAId || !m.teamBId) return null;
  const base = {
    matchId: m.id,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    maxBalls: rules.oversPerInnings * rules.ballsPerOver,
  };

  switch (m.status) {
    case 'completed': {
      const sorted = [...m.innings].sort((a, b) => a.inningsNo - b.inningsNo);
      const [first, second] = sorted;
      if (!first || !second) return null;
      const innings: [InningsSummary, InningsSummary] = [
        summary(asInnings(first.snapshot)),
        summary(asInnings(second.snapshot)),
      ];
      if (m.resultType === 'tie') return { ...base, status: 'tie', winnerTeamId: null, innings };
      if (!m.winnerId) return null;
      return { ...base, status: 'completed', winnerTeamId: m.winnerId, innings };
    }
    case 'walkover':
      return m.winnerId ? { ...base, status: 'walkover', winnerTeamId: m.winnerId, innings: null } : null;
    case 'no_result':
      return { ...base, status: 'noResult', winnerTeamId: null, innings: null };
    case 'abandoned':
      return { ...base, status: 'abandoned', winnerTeamId: null, innings: null };
    default:
      return null;
  }
}
