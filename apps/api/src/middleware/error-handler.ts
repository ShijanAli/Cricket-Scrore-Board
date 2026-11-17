import type { ErrorRequestHandler, RequestHandler } from 'express';
import { EngineError } from '@cricket/engine';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

/** Single place that turns any thrown error into the ApiErrorBody shape. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(err.toBody());
    return;
  }
  // A cricket rule was broken (e.g. wrong striker, bowler quota). The client sent bad data.
  if (err instanceof EngineError) {
    res.status(422).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // A non-UUID id reached a uuid column (Prisma P2023). The client sent a bad id.
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2023') {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'One of the ids is not valid' } });
    return;
  }
  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};
