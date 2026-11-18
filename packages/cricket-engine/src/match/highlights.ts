import type { InningsState } from '@cricket/shared';

export type CelebrationKind = 'team_milestone' | 'player_milestone' | 'wicket' | 'six' | 'four';

export interface Celebration {
  /** Stable per ball, so the same moment is never celebrated twice (polling, reconnects). */
  key: string;
  kind: CelebrationKind;
  teamId: string;
  /** Batter for player milestones/fours/sixes, the dismissed batter for wickets. */
  playerId?: string;
  /** Milestone number: 50, 100, 150 ... (team or player). */
  value?: number;
}

/** Team and player milestones fire every 50 runs: 50, 100, 150 ... 400 and beyond. */
export const MILESTONE_STEP = 50;

const PRIORITY: Record<CelebrationKind, number> = {
  team_milestone: 5,
  player_milestone: 4,
  wicket: 3,
  six: 2,
  four: 1,
};

const crossed = (before: number, after: number): number | null => {
  const hi = Math.floor(after / MILESTONE_STEP);
  return hi > Math.floor(before / MILESTONE_STEP) && hi > 0 ? hi * MILESTONE_STEP : null;
};

const sum = (s: InningsState, field: 'fours' | 'sixes') =>
  Object.values(s.batters).reduce((n, b) => n + b[field], 0);

/**
 * What worth celebrating happened between two snapshots of the SAME innings.
 * Pure and snapshot-based, so it works the same for the scorer, live viewers and polling.
 * Returns [] for the first snapshot (nothing to compare) and for undo (score went backwards).
 * Most important first.
 */
export function detectCelebrations(prev: InningsState | null, next: InningsState): Celebration[] {
  if (!prev) return [];
  if (next.runs < prev.runs || next.wickets < prev.wickets || next.legalBalls < prev.legalBalls) return [];
  if (next.runs === prev.runs && next.wickets === prev.wickets && next.legalBalls === prev.legalBalls) return [];

  const at = `${next.battingTeamId}:${next.legalBalls}:${next.runs}:${next.wickets}`;
  const out: Celebration[] = [];

  const team = crossed(prev.runs, next.runs);
  if (team !== null) {
    out.push({ key: `${at}:team:${team}`, kind: 'team_milestone', teamId: next.battingTeamId, value: team });
  }

  for (const b of Object.values(next.batters)) {
    const m = crossed(prev.batters[b.id]?.runs ?? 0, b.runs);
    if (m !== null) {
      out.push({ key: `${at}:p:${b.id}:${m}`, kind: 'player_milestone', teamId: next.battingTeamId, playerId: b.id, value: m });
    }
  }

  if (next.wickets > prev.wickets) {
    const fell = next.fallOfWickets[next.fallOfWickets.length - 1];
    out.push({ key: `${at}:w`, kind: 'wicket', teamId: next.bowlingTeamId, playerId: fell?.batterId });
  }

  // A boundary is credited to the batter who hit it: find who gained.
  for (const kind of ['sixes', 'fours'] as const) {
    if (sum(next, kind) > sum(prev, kind)) {
      const hitter = Object.values(next.batters).find((b) => b[kind] > (prev.batters[b.id]?.[kind] ?? 0));
      out.push({
        key: `${at}:${kind === 'sixes' ? 'six' : 'four'}`,
        kind: kind === 'sixes' ? 'six' : 'four',
        teamId: next.battingTeamId,
        playerId: hitter?.id,
      });
    }
  }

  return out.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind]);
}
