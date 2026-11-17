import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

/**
 * Validate and replace req[source] with the parsed value (defaults applied, strings trimmed).
 * One zod schema from @cricket/shared is used by the mobile form AND here.
 */
export const validate =
  <S extends ZodTypeAny>(schema: S, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request', result.error.flatten()),
      );
    }
    (req as unknown as Record<Source, z.infer<S>>)[source] = result.data;
    next();
  };
