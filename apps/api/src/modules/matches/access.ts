import { prisma } from '../../db/prisma';
import { conflict, forbidden, notFound } from '../../lib/errors';

/** Owner of the match, or an organiser/scorer of its tournament, can manage and score it. */
export async function assertCanScore(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw notFound('Match');
  if (match.ownerId === userId) return match;

  if (match.tournamentId) {
    const member = await prisma.tournamentMember.findFirst({
      where: { tournamentId: match.tournamentId, userId, role: { in: ['organiser', 'scorer'] } },
    });
    if (member) return match;
  }
  throw forbidden('You are not allowed to score this match');
}

/** Non-throwing version for read endpoints that only need to tell the client what it may do. */
export async function canScore(matchId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    await assertCanScore(matchId, userId);
    return true;
  } catch {
    return false;
  }
}

/** Scoring guard: no ball or toss while the organiser has paused the tournament. */
export async function assertTournamentNotPaused(tournamentId: string | null | undefined) {
  if (!tournamentId) return;
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { status: true } });
  if (t?.status === 'paused') throw conflict('The tournament is paused by the organiser', 'TOURNAMENT_PAUSED');
}
