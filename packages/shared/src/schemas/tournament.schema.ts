import { z } from 'zod';
import { SCHEDULE_MODES, TOURNAMENT_FORMATS } from '../constants/enums';
import { matchRulesSchema } from './rules.schema';

/** Allowed numbers of groups: the top two of each go on to a clean 4, 8 or 16 team knockout. */
export const GROUP_COUNTS = [2, 4, 8] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm');

export const pointsConfigSchema = z.object({
  win: z.number().int().min(0).default(2),
  tie: z.number().int().min(0).default(1),
  noResult: z.number().int().min(0).default(1),
  loss: z.number().int().min(0).default(0),
});
export type PointsConfig = z.infer<typeof pointsConfigSchema>;

export const TIEBREAKERS = ['points', 'wins', 'nrr'] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const schedulerConfigSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    /** Match start times each day, e.g. ["09:00","14:00"] */
    slots: z.array(time24).min(1).max(8),
    grounds: z.array(z.string().trim().min(1)).min(1).max(10).default(['Ground 1']),
    /** Min calendar days between two matches of the same team. 1 = never twice a day. */
    minDaysBetweenMatches: z.number().int().min(0).max(14).default(1),
    offDates: z.array(isoDate).default([]),
    /** 0 = Sunday ... 6 = Saturday */
    offWeekdays: z.array(z.number().int().min(0).max(6)).default([]),
  })
  .refine((c) => c.startDate <= c.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });
export type SchedulerConfig = z.infer<typeof schedulerConfigSchema>;
export type SchedulerConfigInput = z.input<typeof schedulerConfigSchema>;

export const createTournamentSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    format: TOURNAMENT_FORMATS.schema,
    teamCount: z.number().int().min(2).max(32),
    /** Group stage formats only: 2, 4 or 8 groups. The top two of each group go through. */
    groupCount: z.number().int().optional(),
    doubleRoundRobin: z.boolean().default(false),
    scheduleMode: SCHEDULE_MODES.schema.default('auto'),
    scheduler: schedulerConfigSchema.optional(),
    rules: matchRulesSchema,
    points: pointsConfigSchema.default({}),
    tiebreakers: z.array(z.enum(TIEBREAKERS)).min(1).default(['points', 'wins', 'nrr']),
  })
  .superRefine((t, ctx) => {
    if (t.format === 'league_semi_final' && t.teamCount < 4) {
      ctx.addIssue({ code: 'custom', path: ['teamCount'], message: 'Semi-finals need 4+ teams' });
    }
    if (t.format === 'groups_knockout') {
      if (t.groupCount === undefined || !GROUP_COUNTS.includes(t.groupCount as (typeof GROUP_COUNTS)[number])) {
        ctx.addIssue({ code: 'custom', path: ['groupCount'], message: 'Choose 2, 4 or 8 groups' });
      } else if (t.teamCount < t.groupCount * 2) {
        ctx.addIssue({ code: 'custom', path: ['teamCount'], message: `Need at least ${t.groupCount * 2} teams for ${t.groupCount} groups` });
      }
    }
    if (t.scheduleMode === 'auto' && !t.scheduler) {
      ctx.addIssue({ code: 'custom', path: ['scheduler'], message: 'Auto schedule needs scheduler config' });
    }
  });
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type CreateTournamentFormValues = z.input<typeof createTournamentSchema>;

export const createSeriesSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    teamAId: z.string().min(1),
    teamBId: z.string().min(1),
    /** Total matches: odd numbers only (3, 5, 7) so there is a winner. */
    matchCount: z.number().int().min(1).max(9).refine((n) => n % 2 === 1, 'Use an odd number'),
    rules: matchRulesSchema,
  })
  .refine((s) => s.teamAId !== s.teamBId, { message: 'Teams must differ', path: ['teamBId'] });
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;

/**
 * Organiser edits after creation. In a draft everything below can change; once fixtures exist only the
 * name, match rules (applied to matches that have not started), points and tiebreakers can.
 */
export const updateTournamentSchema = z
  .object({
    name: z.string().trim().min(3).max(80).optional(),
    rules: matchRulesSchema.optional(),
    points: pointsConfigSchema.optional(),
    tiebreakers: z.array(z.enum(TIEBREAKERS)).min(1).optional(),
    /** Draft only. */
    teamCount: z.number().int().min(2).max(32).optional(),
    groupCount: z.number().int().optional(),
    doubleRoundRobin: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to update' });
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

/** What a public notice is about. `paused` / `resumed` are created by pause and resume. */
export const NOTICE_KINDS = ['info', 'delay', 'weather', 'dispute', 'rescheduled', 'paused', 'resumed', 'other'] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const createNoticeSchema = z.object({
  kind: z.enum(NOTICE_KINDS).default('info'),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().max(1000).default(''),
});
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

export const pauseTournamentSchema = z.object({
  /** Shown on the public page while the tournament is paused. */
  reason: z.string().trim().min(3).max(200),
  message: z.string().trim().max(1000).default(''),
});
export type PauseTournamentInput = z.infer<typeof pauseTournamentSchema>;

export const resumeTournamentSchema = z.object({ message: z.string().trim().max(1000).default('') });
export type ResumeTournamentInput = z.infer<typeof resumeTournamentSchema>;
