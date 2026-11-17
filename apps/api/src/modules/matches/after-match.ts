import { prisma } from '../../db/prisma';
import { logger } from '../../lib/logger';
import { advanceSeries } from '../tournaments/series.service';
import { advanceTournament } from '../tournaments/tournaments.service';

/**
 * Called after a match finishes: fills playoff slots, closes the tournament or series.
 * Never throws. A failure here must not turn an already committed scoring request into an error.
 */
export async function afterMatchFinished(matchId: string): Promise<void> {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return;
    if (match.tournamentId) await advanceTournament(match.tournamentId);
    if (match.seriesId) await advanceSeries(match.seriesId);
  } catch (e) {
    logger.error('afterMatchFinished failed', e);
  }
}
