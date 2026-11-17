import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const bearer = (req: Request): string | null => {
  const h = req.headers.authorization;
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

/** Sets req.userId. Rejects with 401 when the token is missing or invalid. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = bearer(req);
  if (!token) return next(unauthorized());
  try {
    req.userId = verifyAccessToken(token);
    next();
  } catch (e) {
    next(e);
  }
};

/** Same as requireAuth but anonymous requests pass (public live pages). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = bearer(req);
  if (!token) return next();
  try {
    req.userId = verifyAccessToken(token);
  } catch {
    // ignore bad tokens on public routes
  }
  next();
};

/** Use after requireAuth, gives a non-optional string. */
export const uid = (req: Request): string => {
  if (!req.userId) throw unauthorized();
  return req.userId;
};
