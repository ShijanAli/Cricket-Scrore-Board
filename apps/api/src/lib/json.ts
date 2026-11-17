import type { Prisma } from '@prisma/client';
import { ballEventSchema, matchRulesSchema, type BallEvent, type InningsState, type MatchRules } from '@cricket/shared';

/** Prisma's InputJsonValue rejects interfaces (no index signature). We validated the data ourselves. */
export const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** Parse JSON columns with the same zod schemas used at the API boundary (also fills defaults). */
export const parseRules = (json: unknown): MatchRules => matchRulesSchema.parse(json);
export const parseEvent = (json: unknown): BallEvent => ballEventSchema.parse(json);
export const asInnings = (json: unknown): InningsState => json as InningsState;
