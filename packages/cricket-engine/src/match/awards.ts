import type { InningsState } from '@cricket/shared';

export interface PlayerImpact {
  playerId: string;
  teamId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  maidens: number;
  /** Impact points used to rank players for Man of the Match / Series. */
  points: number;
}

/**
 * Simple, explainable impact formula: 1 per run, +1 per four, +2 per six, +10 per 50 scored,
 * +25 per wicket, +8 per maiden, +10 for 3 wickets / +20 for 5 wickets in an innings.
 */
export function impactPoints(p: Omit<PlayerImpact, 'points' | 'playerId' | 'teamId'>, haulBonus = 0): number {
  return (
    p.runs + p.fours + p.sixes * 2 + Math.floor(p.runs / 50) * 10 + p.wickets * 25 + p.maidens * 8 + haulBonus
  );
}

const haul = (w: number) => (w >= 5 ? 20 : w >= 3 ? 10 : 0);

/** One impact row per player across the given innings (batting and bowling merged). */
export function computeImpact(innings: readonly InningsState[]): PlayerImpact[] {
  const map = new Map<string, PlayerImpact & { bonus: number }>();
  const row = (playerId: string, teamId: string) => {
    let r = map.get(playerId);
    if (!r) {
      r = { playerId, teamId, runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, ballsBowled: 0, runsConceded: 0, maidens: 0, points: 0, bonus: 0 };
      map.set(playerId, r);
    }
    return r;
  };
  for (const inn of innings) {
    for (const b of Object.values(inn.batters)) {
      const r = row(b.id, inn.battingTeamId);
      r.runs += b.runs;
      r.balls += b.balls;
      r.fours += b.fours;
      r.sixes += b.sixes;
    }
    for (const b of Object.values(inn.bowlers)) {
      const r = row(b.id, inn.bowlingTeamId);
      r.wickets += b.wickets;
      r.ballsBowled += b.legalBalls;
      r.runsConceded += b.runs;
      r.maidens += b.maidens;
      r.bonus += haul(b.wickets);
    }
  }
  return [...map.values()].map(({ bonus, ...r }) => ({ ...r, points: impactPoints(r, bonus) }));
}

/**
 * Per-player haul bonuses are per innings, so merging several matches must carry points, not recompute them.
 */
export function mergeImpacts(lists: readonly (readonly PlayerImpact[])[]): PlayerImpact[] {
  const map = new Map<string, PlayerImpact>();
  for (const list of lists) {
    for (const p of list) {
      const r = map.get(p.playerId);
      if (!r) map.set(p.playerId, { ...p });
      else {
        r.runs += p.runs;
        r.balls += p.balls;
        r.fours += p.fours;
        r.sixes += p.sixes;
        r.wickets += p.wickets;
        r.ballsBowled += p.ballsBowled;
        r.runsConceded += p.runsConceded;
        r.maidens += p.maidens;
        r.points += p.points;
      }
    }
  }
  return [...map.values()];
}

/** Highest points; ties go to the winning side, then more runs, then more wickets. */
export function pickBestPlayer(impacts: readonly PlayerImpact[], winnerTeamId: string | null = null): PlayerImpact | null {
  const eligible = impacts.filter((p) => p.points > 0);
  if (eligible.length === 0) return null;
  return [...eligible].sort(
    (a, b) =>
      b.points - a.points ||
      Number(b.teamId === winnerTeamId) - Number(a.teamId === winnerTeamId) ||
      b.runs - a.runs ||
      b.wickets - a.wickets ||
      a.playerId.localeCompare(b.playerId),
  )[0]!;
}

export const topRunScorer = (impacts: readonly PlayerImpact[]): PlayerImpact | null =>
  [...impacts].filter((p) => p.runs > 0).sort((a, b) => b.runs - a.runs || a.balls - b.balls || a.playerId.localeCompare(b.playerId))[0] ?? null;

export const topWicketTaker = (impacts: readonly PlayerImpact[]): PlayerImpact | null =>
  [...impacts]
    .filter((p) => p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded || a.playerId.localeCompare(b.playerId))[0] ?? null;
