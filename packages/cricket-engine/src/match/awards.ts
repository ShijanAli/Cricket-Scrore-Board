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

/** Best first: points, then winning side, then more runs, then more wickets. */
export function rankImpacts(impacts: readonly PlayerImpact[], winnerTeamId: string | null = null): PlayerImpact[] {
  return impacts
    .filter((p) => p.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        Number(b.teamId === winnerTeamId) - Number(a.teamId === winnerTeamId) ||
        b.runs - a.runs ||
        b.wickets - a.wickets ||
        a.playerId.localeCompare(b.playerId),
    );
}

/** Highest points; ties go to the winning side, then more runs, then more wickets. */
export function pickBestPlayer(impacts: readonly PlayerImpact[], winnerTeamId: string | null = null): PlayerImpact | null {
  return rankImpacts(impacts, winnerTeamId)[0] ?? null;
}

export const mostSixes = (impacts: readonly PlayerImpact[]): PlayerImpact | null =>
  [...impacts].filter((p) => p.sixes > 0).sort((a, b) => b.sixes - a.sixes || b.runs - a.runs || a.playerId.localeCompare(b.playerId))[0] ?? null;

export const topRunScorer = (impacts: readonly PlayerImpact[]): PlayerImpact | null =>
  [...impacts].filter((p) => p.runs > 0).sort((a, b) => b.runs - a.runs || a.balls - b.balls || a.playerId.localeCompare(b.playerId))[0] ?? null;

export const topWicketTaker = (impacts: readonly PlayerImpact[]): PlayerImpact | null =>
  [...impacts]
    .filter((p) => p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded || a.playerId.localeCompare(b.playerId))[0] ?? null;

/** Shown next to every "Man of the ..." so the rule is never a mystery. */
export const IMPACT_FORMULA =
  'Impact points: 1 per run, +1 per four, +2 per six, +10 for every 50 runs, +25 per wicket, +8 per maiden over, +10 for 3 wickets or +20 for 5 wickets in an innings.';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : w.endsWith('x') ? 'es' : 's'}`;

/** What a player did, in words: "52 runs (31 balls, 4 fours, 2 sixes) and 2 wickets for 18". */
export function describePerformance(p: PlayerImpact, matches?: number): string {
  const parts: string[] = [];
  if (p.runs > 0 || p.balls > 0) {
    const detail = [p.balls > 0 ? plural(p.balls, 'ball') : null, p.fours > 0 ? plural(p.fours, 'four') : null, p.sixes > 0 ? plural(p.sixes, 'six') : null]
      .filter(Boolean)
      .join(', ');
    parts.push(`${plural(p.runs, 'run')}${detail ? ` (${detail})` : ''}`);
  }
  if (p.wickets > 0) parts.push(`${plural(p.wickets, 'wicket')} for ${p.runsConceded}`);
  if (p.maidens > 0) parts.push(plural(p.maidens, 'maiden'));
  const text = parts.join(' and ') || 'a useful all-round contribution';
  return matches && matches > 1 ? `${text} over ${matches} matches` : text;
}

export interface AwardExplanationInput {
  /** "Man of the Match", "Man of the Series", "Man of the Tournament" */
  title: string;
  winner: PlayerImpact;
  winnerName: string;
  teamName: string;
  /** Everyone, best first (rankImpacts). */
  ranked: readonly PlayerImpact[];
  nameOf: (playerId: string) => string;
  matches?: number;
}

/**
 * Plain-language reason, e.g. "Rahim (Alpha) is Man of the Match: 52 runs (31 balls, 4 fours) and
 * 2 wickets for 18. 96 impact points, 18 more than Karim (78)."
 */
export function explainAward(i: AwardExplanationInput): string {
  const second = i.ranked.find((p) => p.playerId !== i.winner.playerId);
  const margin = second
    ? i.winner.points === second.points
      ? ` Level on points with ${i.nameOf(second.playerId)}; the tie was settled by the winning side, then runs, then wickets.`
      : ` ${i.winner.points} impact points, ${i.winner.points - second.points} more than ${i.nameOf(second.playerId)} (${second.points}).`
    : ` ${i.winner.points} impact points.`;
  return `${i.winnerName} (${i.teamName}) is ${i.title}: ${describePerformance(i.winner, i.matches)}.${margin}`;
}

export function explainTopScorer(p: PlayerImpact, name: string, matches?: number): string {
  const sr = p.balls > 0 ? ` at a strike rate of ${((p.runs / p.balls) * 100).toFixed(1)}` : '';
  return `${name} scored the most runs: ${plural(p.runs, 'run')}${matches && matches > 1 ? ` in ${plural(matches, 'match')}` : ''}${sr}.`;
}

export function explainTopWicketTaker(p: PlayerImpact, name: string, matches?: number): string {
  return `${name} took the most wickets: ${plural(p.wickets, 'wicket')} for ${p.runsConceded} runs${matches && matches > 1 ? ` in ${plural(matches, 'match')}` : ''}. Fewer runs conceded breaks a tie.`;
}

export function explainMostSixes(p: PlayerImpact, name: string): string {
  return `${name} hit the most sixes: ${p.sixes}.`;
}
