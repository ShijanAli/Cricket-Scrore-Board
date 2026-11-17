import type { LoginInput, RegisterInput } from '@cricket/shared';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { isUniqueViolation } from '../../db/errors';
import { conflict, notFound, unauthorized } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import { hashToken, newRefreshToken, signAccessToken } from '../../lib/tokens';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

const toPublic = (u: { id: string; name: string; email: string }): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
});

const refreshExpiry = () => new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

async function issueTokens(user: PublicUser): Promise<AuthResult> {
  const refreshToken = newRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiry() },
  });
  return { user, accessToken: signAccessToken(user.id), refreshToken };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    return issueTokens(toPublic(user));
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');
    throw e;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same error for unknown email and wrong password, so emails cannot be probed.
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw unauthorized('Email or password is incorrect', 'INVALID_CREDENTIALS');
  return issueTokens(toPublic(user));
}

/**
 * Rotating refresh tokens: every refresh revokes the old token and issues a new one.
 * If an already-revoked token is presented again it was probably stolen, so every session
 * of that user is revoked.
 */
export async function refresh(rawToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored) throw unauthorized('Invalid refresh token', 'INVALID_TOKEN');

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Refresh token was already used', 'TOKEN_REUSED');
  }
  if (stored.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
  }

  // Claim the token atomically: if two requests race, only one gets count = 1.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) throw unauthorized('Refresh token was already used', 'TOKEN_REUSED');

  return issueTokens(toPublic(stored.user));
}

export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User');
  return toPublic(user);
}
