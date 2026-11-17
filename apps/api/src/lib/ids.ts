import { z } from 'zod';

/** All primary keys are UUIDs. Validate before they reach Postgres (a bad id would be a 500). */
export const uuidSchema = z.string().uuid('must be a valid id');
export const idParams = z.object({ id: uuidSchema });
export const isUuid = (v: string): boolean => uuidSchema.safeParse(v).success;
