import type { InningsState } from '@cricket/shared';
import {
  computeImpact,
  pickBestPlayer,
  topRunScorer,
  topWicketTaker,
  type PlayerImpact,
} from './awards';
import { computeResult, type MatchResult } from './result';

export interface TeamScore {
  teamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  ballsPerOver: number;
}

export interface MatchReport {
  result: MatchResult;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  /** Batting order: first innings first. */
  scores: [TeamScore, TeamScore];
  /** Runs margin when won by runs, wickets in hand when chased down. */
  margin: number;
  marginKind: 'runs' | 'wickets' | 'tie';
  /** Chase won: balls left over. */
  ballsLeft: number | null;
  manOfTheMatch: PlayerImpact | null;
  topBatter: PlayerImpact | null;
  topBowler: PlayerImpact | null;
  impacts: PlayerImpact[];
}

const score = (s: InningsState): TeamScore => ({
  teamId: s.battingTeamId,
  runs: s.runs,
  wickets: s.wickets,
  legalBalls: s.legalBalls,
  ballsPerOver: s.ballsPerOver,
});

/** Full result summary for a finished two-innings match; null while it is still going. */
export function buildMatchReport(first: InningsState | null | undefined, second: InningsState | null | undefined): MatchReport | null {
  if (!first || !second) return null;
  const result = computeResult(first, second);
  if (!result) return null;

  const impacts = computeImpact([first, second]);
  const winnerTeamId = result.winnerTeamId;
  const loserTeamId =
    winnerTeamId === null ? null : winnerTeamId === first.battingTeamId ? second.battingTeamId : first.battingTeamId;

  return {
    result,
    winnerTeamId,
    loserTeamId,
    scores: [score(first), score(second)],
    margin: result.margin,
    marginKind: result.type === 'won_by_runs' ? 'runs' : result.type === 'won_by_wickets' ? 'wickets' : 'tie',
    ballsLeft: result.type === 'won_by_wickets' ? Math.max(0, second.maxBalls - second.legalBalls) : null,
    manOfTheMatch: pickBestPlayer(impacts, winnerTeamId),
    topBatter: topRunScorer(impacts),
    topBowler: topWicketTaker(impacts),
    impacts,
  };
}
