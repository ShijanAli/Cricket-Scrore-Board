import { DEFAULT_POINTS, type PointsConfig, type Tiebreaker } from '@cricket/shared';
import { EngineError } from '../errors';

export interface InningsSummary {
  teamId: string;
  runs: number;
  ballsFaced: number;
  allOut: boolean;
}

export interface MatchOutcome {
  matchId: string;
  teamAId: string;
  teamBId: string;
  status: 'completed' | 'tie' | 'noResult' | 'abandoned' | 'walkover';
  /** Required for completed and walkover. */
  winnerTeamId: string | null;
  /** Both innings, needed for NRR (completed and tie only). */
  innings: [InningsSummary, InningsSummary] | null;
  /** Balls allotted to each team in this match (after any reduction). */
  maxBalls: number;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number;
  rank: number;
}

/**
 * Net run rate: (runs scored / overs faced) - (runs conceded / overs bowled).
 * A team that is all out is treated as having faced its full quota of overs.
 * No-result, abandoned and walkover matches do not count.
 */
export function netRunRate(outcomes: readonly MatchOutcome[], teamId: string, ballsPerOver = 6): number {
  let runsFor = 0;
  let ballsFor = 0;
  let runsAgainst = 0;
  let ballsAgainst = 0;
  for (const o of outcomes) {
    if ((o.status !== 'completed' && o.status !== 'tie') || !o.innings) continue;
    const mine = o.innings.find((i) => i.teamId === teamId);
    const theirs = o.innings.find((i) => i.teamId !== teamId);
    if (!mine || !theirs) continue;
    runsFor += mine.runs;
    ballsFor += mine.allOut ? o.maxBalls : mine.ballsFaced;
    runsAgainst += theirs.runs;
    ballsAgainst += theirs.allOut ? o.maxBalls : theirs.ballsFaced;
  }
  if (ballsFor === 0 || ballsAgainst === 0) return 0;
  return runsFor / (ballsFor / ballsPerOver) - runsAgainst / (ballsAgainst / ballsPerOver);
}

export interface StandingsOptions {
  points?: PointsConfig;
  tiebreakers?: readonly Tiebreaker[];
  ballsPerOver?: number;
}

export function computeStandings(
  teamIds: readonly string[],
  outcomes: readonly MatchOutcome[],
  options: StandingsOptions = {},
): StandingRow[] {
  const points = options.points ?? DEFAULT_POINTS;
  const tiebreakers = options.tiebreakers ?? (['points', 'wins', 'nrr'] as const);
  const ballsPerOver = options.ballsPerOver ?? 6;

  const rows = new Map<string, Omit<StandingRow, 'rank' | 'nrr' | 'points'>>();
  for (const id of teamIds) {
    rows.set(id, { teamId: id, played: 0, won: 0, lost: 0, tied: 0, noResult: 0 });
  }

  const relevant: MatchOutcome[] = [];
  for (const o of outcomes) {
    const a = rows.get(o.teamAId);
    const b = rows.get(o.teamBId);
    if (!a || !b) continue;
    relevant.push(o);
    a.played++;
    b.played++;
    switch (o.status) {
      case 'completed':
      case 'walkover': {
        if (o.winnerTeamId !== o.teamAId && o.winnerTeamId !== o.teamBId) {
          throw new EngineError('INVALID_OUTCOME', `Match ${o.matchId} needs a winner`);
        }
        const [winner, loser] = o.winnerTeamId === o.teamAId ? [a, b] : [b, a];
        winner.won++;
        loser.lost++;
        break;
      }
      case 'tie':
        a.tied++;
        b.tied++;
        break;
      case 'noResult':
      case 'abandoned':
        a.noResult++;
        b.noResult++;
        break;
    }
  }

  const table: StandingRow[] = [...rows.values()].map((r) => ({
    ...r,
    points: r.won * points.win + r.tied * points.tie + r.noResult * points.noResult + r.lost * points.loss,
    nrr: netRunRate(relevant, r.teamId, ballsPerOver),
    rank: 0,
  }));

  const key = (row: StandingRow, t: Tiebreaker): number =>
    t === 'points' ? row.points : t === 'wins' ? row.won : row.nrr;

  table.sort((x, y) => {
    for (const t of tiebreakers) {
      const diff = key(y, t) - key(x, t);
      if (diff !== 0) return diff;
    }
    return x.teamId.localeCompare(y.teamId);
  });
  table.forEach((row, i) => (row.rank = i + 1));
  return table;
}
