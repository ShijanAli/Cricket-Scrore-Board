import { z } from 'zod';
import { TOSS_DECISIONS } from '../constants/enums';
import { matchRulesSchema } from './rules.schema';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm');

export const createSingleMatchSchema = z
  .object({
    teamAName: z.string().trim().min(2).max(40),
    teamBName: z.string().trim().min(2).max(40),
    rules: matchRulesSchema,
    scheduledDate: isoDate.optional(),
    scheduledTime: time24.optional(),
    ground: z.string().trim().max(80).optional(),
  })
  .refine((m) => m.teamAName.toLowerCase() !== m.teamBName.toLowerCase(), {
    message: 'Team names must be different',
    path: ['teamBName'],
  });
export type CreateSingleMatchInput = z.infer<typeof createSingleMatchSchema>;

export const tossSchema = z.object({
  winnerTeamId: z.string().min(1),
  decision: TOSS_DECISIONS.schema,
});
export type TossInput = z.infer<typeof tossSchema>;

export const playingXISchema = z.object({
  teamId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).min(2).max(15),
});
export type PlayingXIInput = z.infer<typeof playingXISchema>;

export const scheduleMatchSchema = z.object({
  scheduledDate: isoDate,
  scheduledTime: time24,
  ground: z.string().trim().max(80).optional(),
});
export type ScheduleMatchInput = z.infer<typeof scheduleMatchSchema>;
