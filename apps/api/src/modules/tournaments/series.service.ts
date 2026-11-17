import type { CreateSeriesInput } from '@cricket/shared';
import { prisma } from '../../db/prisma';
import { forbidden, notFound } from '../../lib/errors';
import { toJson } from '../../lib/json';
import { withDateString } from '../matches/mapper';

export async function createSeries(userId: string, input: CreateSeriesInput) {
  const teams = await prisma.team.findMany({ where: { id: { in: [input.teamAId, input.teamBId] } } });
  if (teams.length !== 2) throw notFound('Team');
  if (teams.some((t) => t.ownerId !== userId)) throw forbidden('You can only use teams you own');

  return prisma.$transaction(async (tx) => {
    const series = await tx.series.create({
      data: {
        ownerId: userId,
        name: input.name,
        teamAId: input.teamAId,
        teamBId: input.teamBId,
        matchCount: input.matchCount,
        rules: toJson(input.rules),
      },
    });
    await tx.match.createMany({
      data: Array.from({ length: input.matchCount }, (_, i) => ({
        type: 'series' as const,
        ownerId: userId,
        seriesId: series.id,
        matchNo: i + 1,
        teamAId: input.teamAId,
        teamBId: input.teamBId,
        status: 'scheduled' as const,
        rules: toJson(input.rules),
      })),
    });
    return series;
  });
}

export const listMySeries = (userId: string) =>
  prisma.series.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' }, include: { teamA: true, teamB: true } });

/** Series with its matches and the running score (wins per side). */
export async function getSeries(id: string) {
  const series = await prisma.series.findUnique({
    where: { id },
    include: { teamA: true, teamB: true, matches: { orderBy: { matchNo: 'asc' } } },
  });
  if (!series) throw notFound('Series');

  const winsA = series.matches.filter((m) => m.winnerId === series.teamAId).length;
  const winsB = series.matches.filter((m) => m.winnerId === series.teamBId).length;
  const needed = Math.floor(series.matchCount / 2) + 1;
  const winnerTeamId = winsA >= needed ? series.teamAId : winsB >= needed ? series.teamBId : null;
  const { matches, ...rest } = series;
  return { ...rest, matches: matches.map(withDateString), score: { winsA, winsB, needed, winnerTeamId } };
}

const FINISHED = ['completed', 'abandoned', 'no_result', 'walkover'];

/** Close the series once one side has the majority of wins, or every match is finished. */
export async function advanceSeries(seriesId: string): Promise<void> {
  const series = await prisma.series.findUnique({ where: { id: seriesId }, include: { matches: true } });
  if (!series || series.status === 'completed') return;
  const wins = (teamId: string) => series.matches.filter((m) => m.winnerId === teamId).length;
  const needed = Math.floor(series.matchCount / 2) + 1;
  const decided = wins(series.teamAId) >= needed || wins(series.teamBId) >= needed;
  const allDone = series.matches.every((m) => FINISHED.includes(m.status));
  if (decided || allDone) {
    await prisma.series.update({ where: { id: seriesId }, data: { status: 'completed' } });
  }
}
