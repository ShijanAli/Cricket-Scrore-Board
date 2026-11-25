import { z } from 'zod';
import { PLAYER_ROLES } from '../constants/enums';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a #RRGGBB color');
const bdPhone = z.string().regex(/^01[3-9]\d{8}$/, 'must be a valid BD mobile number');

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(40),
  shortName: z.string().trim().min(2).max(4).transform((s) => s.toUpperCase()),
  color: hexColor.default('#0E7C4A'),
  contactNumber: bdPhone.optional(),
  logoUrl: z.string().url().optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateTeamFormValues = z.input<typeof createTeamSchema>;
export const updateTeamSchema = createTeamSchema.partial();
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const createPlayerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  role: PLAYER_ROLES.schema.default('batter'),
  phone: bdPhone.optional(),
  jerseyNumber: z.number().int().min(0).max(999).optional(),
});
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type CreatePlayerFormValues = z.input<typeof createPlayerSchema>;

export const addSquadPlayerSchema = z.object({
  playerId: z.string().min(1).optional(),
  /** Create a guest player on the fly when no playerId is given. */
  newPlayer: createPlayerSchema.optional(),
  isCaptain: z.boolean().default(false),
  isViceCaptain: z.boolean().default(false),
  isWicketkeeper: z.boolean().default(false),
}).refine((v) => Boolean(v.playerId) !== Boolean(v.newPlayer), {
  message: 'Provide either playerId or newPlayer',
  path: ['playerId'],
});
export type AddSquadPlayerInput = z.infer<typeof addSquadPlayerSchema>;

/** Create several guest players and add them all to a squad in one request. */
export const addSquadPlayersBulkSchema = z.object({
  players: z
    .array(
      createPlayerSchema.extend({
        isCaptain: z.boolean().default(false),
        isViceCaptain: z.boolean().default(false),
        isWicketkeeper: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(25),
});
export type AddSquadPlayersBulkInput = z.infer<typeof addSquadPlayersBulkSchema>;
