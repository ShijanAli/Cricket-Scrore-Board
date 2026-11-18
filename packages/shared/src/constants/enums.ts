import { z } from 'zod';

/** Helper: build a zod enum + a typed const array from one list. */
const defineEnum = <const T extends readonly [string, ...string[]]>(values: T) => ({
  values,
  schema: z.enum(values),
});

// ---------- Match ----------
export const MATCH_TYPES = defineEnum(['single', 'tournament', 'series'] as const);
export type MatchType = (typeof MATCH_TYPES.values)[number];

export const MATCH_STATUSES = defineEnum([
  'scheduled',
  'toss',
  'live',
  'innings_break',
  'completed',
  'abandoned',
  'no_result',
  'walkover',
] as const);
export type MatchStatus = (typeof MATCH_STATUSES.values)[number];

export const RESULT_TYPES = defineEnum([
  'won_by_runs',
  'won_by_wickets',
  'tie',
  'no_result',
  'abandoned',
  'walkover',
] as const);
export type ResultType = (typeof RESULT_TYPES.values)[number];

export const TOSS_DECISIONS = defineEnum(['bat', 'bowl'] as const);
export type TossDecision = (typeof TOSS_DECISIONS.values)[number];

// ---------- Ball-by-ball ----------
export const EXTRA_TYPES = defineEnum(['none', 'wide', 'noBall', 'bye', 'legBye'] as const);
export type ExtraType = (typeof EXTRA_TYPES.values)[number];

/** Who the runs scored off a no-ball belong to. */
export const NO_BALL_RUN_SOURCES = defineEnum(['bat', 'bye', 'legBye'] as const);
export type NoBallRunSource = (typeof NO_BALL_RUN_SOURCES.values)[number];

export const WICKET_TYPES = defineEnum([
  'bowled',
  'caught',
  'lbw',
  'runOut',
  'stumped',
  'hitWicket',
  'obstructingField',
  'hitBallTwice',
  'handledBall',
] as const);
export type WicketType = (typeof WICKET_TYPES.values)[number];

/** Dismissals credited to the bowler. */
export const BOWLER_CREDITED_WICKETS: readonly WicketType[] = [
  'bowled',
  'caught',
  'lbw',
  'stumped',
  'hitWicket',
];

/** Dismissals that are only possible off the bat's own action: need runs === 0. */
export const ZERO_RUN_WICKETS: readonly WicketType[] = [...BOWLER_CREDITED_WICKETS];

/** Dismissals still possible on a no-ball or a free hit. */
export const NO_BALL_VALID_WICKETS: readonly WicketType[] = [
  'runOut',
  'obstructingField',
  'hitBallTwice',
  'handledBall',
];

/** Dismissals possible on a wide. */
export const WIDE_VALID_WICKETS: readonly WicketType[] = [
  'stumped',
  'runOut',
  'hitWicket',
  'obstructingField',
  'hitBallTwice',
  'handledBall',
];

export const RETIRE_REASONS = defineEnum(['hurt', 'out'] as const);
export type RetireReason = (typeof RETIRE_REASONS.values)[number];

// ---------- People / tournament ----------
export const PLAYER_ROLES = defineEnum([
  'batter',
  'bowler',
  'all_rounder',
  'wicketkeeper',
] as const);
export type PlayerRole = (typeof PLAYER_ROLES.values)[number];

export const MEMBER_ROLES = defineEnum(['organiser', 'scorer', 'captain'] as const);
export type MemberRole = (typeof MEMBER_ROLES.values)[number];

export const TOURNAMENT_FORMATS = defineEnum([
  'league',
  'league_final',
  'league_semi_final',
  'knockout',
  'groups_knockout',
] as const);
export type TournamentFormat = (typeof TOURNAMENT_FORMATS.values)[number];

export const SCHEDULE_MODES = defineEnum(['auto', 'manual'] as const);
export type ScheduleMode = (typeof SCHEDULE_MODES.values)[number];
