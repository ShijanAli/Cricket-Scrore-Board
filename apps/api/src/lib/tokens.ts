import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from './errors';

export interface AccessPayload {
  sub: string;
}

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS });

/** Returns the user id, or throws 401. Used by both the HTTP middleware and the socket handshake. */
export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub;
  } catch {
    // fall through
  }
  throw unauthorized('Invalid or expired token', 'INVALID_TOKEN');
}

/**
 * Refresh tokens are opaque random strings, stored only as a SHA-256 hash.
 * (The JWT refresh secret is reserved for signed tokens if we ever need them.)
 */
export const newRefreshToken = (): string => randomBytes(48).toString('base64url');
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
