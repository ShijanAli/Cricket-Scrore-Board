import type { InningsState } from '@cricket/shared';

export interface ChaseInfo {
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  requiredRunRate: number | null;
}

export function chaseInfo(first: InningsState, second: InningsState): ChaseInfo {
  const target = first.runs + 1;
  const runsNeeded = Math.max(0, target - second.runs);
  const ballsRemaining = Math.max(0, second.maxBalls - second.legalBalls);
  return {
    target,
    runsNeeded,
    ballsRemaining,
    requiredRunRate: ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * second.ballsPerOver : null,
  };
}

export type MatchResult =
  | { type: 'won_by_runs'; winnerTeamId: string; margin: number }
  | { type: 'won_by_wickets'; winnerTeamId: string; margin: number }
  | { type: 'tie'; winnerTeamId: null; margin: 0 };

/** null while the match is still in progress. */
export function computeResult(first: InningsState, second: InningsState): MatchResult | null {
  if (first.status !== 'completed') return null;
  if (second.completedReason === 'targetReached') {
    return {
      type: 'won_by_wickets',
      winnerTeamId: second.battingTeamId,
      margin: second.maxWickets - second.wickets,
    };
  }
  if (second.status !== 'completed') return null;
  if (second.runs < first.runs) {
    return { type: 'won_by_runs', winnerTeamId: first.battingTeamId, margin: first.runs - second.runs };
  }
  return { type: 'tie', winnerTeamId: null, margin: 0 };
}

/** Human readable, e.g. "Team A won by 12 runs". */
export function describeResult(result: MatchResult, teamName: (id: string) => string): string {
  switch (result.type) {
    case 'won_by_runs':
      return `${teamName(result.winnerTeamId)} won by ${result.margin} run${result.margin === 1 ? '' : 's'}`;
    case 'won_by_wickets':
      return `${teamName(result.winnerTeamId)} won by ${result.margin} wicket${result.margin === 1 ? '' : 's'}`;
    case 'tie':
      return 'Match tied';
  }
}
