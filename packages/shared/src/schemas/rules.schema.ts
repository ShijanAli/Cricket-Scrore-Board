import { z } from 'zod';

export const matchRulesSchema = z
  .object({
    oversPerInnings: z.number().int().min(1).max(100),
    ballsPerOver: z.number().int().min(1).max(12).default(6),
    /** null = no limit */
    maxOversPerBowler: z.number().int().min(1).max(100).nullable().default(null),
    playersPerSide: z.number().int().min(2).max(15).default(11),
    wideRuns: z.number().int().min(0).max(5).default(1),
    noBallRuns: z.number().int().min(0).max(5).default(1),
    freeHitOnNoBall: z.boolean().default(true),
    allowByes: z.boolean().default(true),
    allowLegByes: z.boolean().default(true),
    /** Last batter may bat alone (no non-striker). */
    lastManStands: z.boolean().default(false),
  })
  .refine((r) => r.maxOversPerBowler === null || r.maxOversPerBowler <= r.oversPerInnings, {
    message: 'maxOversPerBowler cannot exceed oversPerInnings',
    path: ['maxOversPerBowler'],
  });

export type MatchRules = z.infer<typeof matchRulesSchema>;
export type MatchRulesInput = z.input<typeof matchRulesSchema>;
