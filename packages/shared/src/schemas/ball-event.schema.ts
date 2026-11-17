import { z } from 'zod';
import {
  EXTRA_TYPES,
  NO_BALL_RUN_SOURCES,
  RETIRE_REASONS,
  WICKET_TYPES,
} from '../constants/enums';

const id = z.string().min(1).max(64);

export const wicketSchema = z.object({
  type: WICKET_TYPES.schema,
  playerOutId: id,
  fielderId: id.optional(),
});
export type Wicket = z.infer<typeof wicketSchema>;

const base = z.object({
  /** Client-generated UUID. Makes sync idempotent. */
  id,
});

export const deliveryEventSchema = base
  .extend({
    type: z.literal('delivery'),
    strikerId: id,
    bowlerId: id,
    /**
     * Runs physically run/credited, EXCLUDING the wide/no-ball penalty.
     * - none: runs off the bat
     * - wide: additional runs run
     * - noBall: runs off bat/bye/legBye (see noBallRunsFrom)
     * - bye / legBye: byes / leg byes
     */
    runs: z.number().int().min(0).max(12),
    extra: EXTRA_TYPES.schema.default('none'),
    noBallRunsFrom: NO_BALL_RUN_SOURCES.schema.default('bat'),
    /** Ball reached the boundary (4 or 6). */
    boundary: z.boolean().default(false),
    wicket: wicketSchema.optional(),
  })
  .superRefine((e, ctx) => {
    if (e.boundary && e.runs < 4) {
      ctx.addIssue({ code: 'custom', path: ['boundary'], message: 'boundary needs runs >= 4' });
    }
    if ((e.extra === 'bye' || e.extra === 'legBye') && e.runs < 1) {
      ctx.addIssue({ code: 'custom', path: ['runs'], message: 'bye/legBye needs runs >= 1' });
    }
  });
export type DeliveryEvent = z.infer<typeof deliveryEventSchema>;
export type DeliveryEventInput = z.input<typeof deliveryEventSchema>;

export const batterInEventSchema = base.extend({
  type: z.literal('batterIn'),
  batterId: id,
});
export type BatterInEvent = z.infer<typeof batterInEventSchema>;

export const bowlerSelectedEventSchema = base.extend({
  type: z.literal('bowlerSelected'),
  bowlerId: id,
});
export type BowlerSelectedEvent = z.infer<typeof bowlerSelectedEventSchema>;

export const strikeSwapEventSchema = base.extend({ type: z.literal('strikeSwap') });
export type StrikeSwapEvent = z.infer<typeof strikeSwapEventSchema>;

export const retireEventSchema = base.extend({
  type: z.literal('retire'),
  batterId: id,
  reason: RETIRE_REASONS.schema,
});
export type RetireEvent = z.infer<typeof retireEventSchema>;

/** Undo is an event, not a delete: the log stays append-only. */
export const undoEventSchema = base.extend({
  type: z.literal('undo'),
  targetEventId: id,
});
export type UndoEvent = z.infer<typeof undoEventSchema>;

/**
 * NOTE: zod's discriminatedUnion cannot take ZodEffects (superRefine), so we use z.union
 * with the literal `type` field; each member still fully validates.
 */
export const ballEventSchema = z.union([
  deliveryEventSchema,
  batterInEventSchema,
  bowlerSelectedEventSchema,
  strikeSwapEventSchema,
  retireEventSchema,
  undoEventSchema,
]);
export type BallEvent = z.infer<typeof ballEventSchema>;
export type BallEventInput = z.input<typeof ballEventSchema>;

/** Batch ingest payload for POST /matches/:id/events */
export const ingestEventsSchema = z.object({
  inningsNo: z.number().int().min(1).max(4),
  events: z.array(ballEventSchema).min(1).max(200),
});
export type IngestEventsInput = z.infer<typeof ingestEventsSchema>;

export const inningsSetupSchema = z
  .object({
    battingTeamId: id,
    bowlingTeamId: id,
    strikerId: id,
    nonStrikerId: id,
    bowlerId: id,
  })
  .refine((s) => s.strikerId !== s.nonStrikerId, {
    message: 'striker and non-striker must be different',
    path: ['nonStrikerId'],
  })
  .refine((s) => s.battingTeamId !== s.bowlingTeamId, {
    message: 'batting and bowling team must be different',
    path: ['bowlingTeamId'],
  });
export type InningsSetup = z.infer<typeof inningsSetupSchema>;
