import type {
  CreateSingleMatchInput,
  PaginationQuery,
  PlayingXIInput,
  ScheduleMatchInput,
  TossInput,
} from '@cricket/shared';
import { prisma, type Db } from '../../db/prisma';
import { fromDateOnly } from '../../lib/dates';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { parseRules, toJson } from '../../lib/json';
import { shortNameOf } from '../../lib/strings';
import { liveBus } from '../live/live-bus';
import { assertCanScore } from './access';
import { afterMatchFinished } from './after-match';
import { matchInclude, withDateString } from './mapper';

async function findOrCreateTeam(db: Db, userId: string, name: string) {
  const existing = await db.team.findUnique({ where: { ownerId_name: { ownerId: userId, name } } });
  if (existing) return existing;
  return db.team.create({ data: { ownerId: userId, name, shortName: shortNameOf(name) } });
}

/** A friendly match between two named teams. Teams are created on the fly if they do not exist. */
export async function createSingleMatch(userId: string, input: CreateSingleMatchInput) {
  const match = await prisma.$transaction(async (tx) => {
    const teamA = await findOrCreateTeam(tx, userId, input.teamAName);
    const teamB = await findOrCreateTeam(tx, userId, input.teamBName);
    return tx.match.create({
      data: {
        type: 'single',
        ownerId: userId,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: 'scheduled',
        rules: toJson(input.rules),
        scheduledDate: input.scheduledDate ? fromDateOnly(input.scheduledDate) : null,
        scheduledTime: input.scheduledTime ?? null,
        ground: input.ground ?? null,
      },
      include: matchInclude,
    });
  });
  return withDateString(match);
}

export async function getMatchView(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: matchInclude });
  if (!match) throw notFound('Match');
  return withDateString(match);
}

export async function listMyMatches(userId: string, q: PaginationQuery) {
  const where = {
    OR: [{ ownerId: userId }, { tournament: { members: { some: { userId } } } }],
  };
  const [items, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { teamA: true, teamB: true },
    }),
    prisma.match.count({ where }),
  ]);
  return { items: items.map(withDateString), page: q.page, pageSize: q.pageSize, total };
}

/** Public: everything being played right now. */
export async function listLiveMatches() {
  const items = await prisma.match.findMany({
    where: { status: { in: ['live', 'innings_break'] } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { teamA: true, teamB: true, innings: { orderBy: { inningsNo: 'asc' } } },
  });
  return items.map(withDateString);
}

/** Matches whose teams/XI/toss can still change. */
const PRE_MATCH = ['scheduled', 'toss'] as const;
const isPreMatch = (status: string) => (PRE_MATCH as readonly string[]).includes(status);

export async function setPlayingXI(matchId: string, userId: string, input: PlayingXIInput) {
  const match = await assertCanScore(matchId, userId);
  if (!isPreMatch(match.status)) throw conflict('The match has already started', 'MATCH_STARTED');
  if (input.teamId !== match.teamAId && input.teamId !== match.teamBId) {
    throw badRequest('This team is not playing in the match', 'TEAM_NOT_IN_MATCH');
  }
  if (!match.teamAId || !match.teamBId) {
    throw conflict('Both teams must be decided first', 'TEAMS_NOT_SET');
  }

  const rules = parseRules(match.rules);
  const ids = [...new Set(input.playerIds)];
  if (ids.length !== input.playerIds.length) throw badRequest('Duplicate players in the XI', 'DUPLICATE_PLAYER');
  if (ids.length > rules.playersPerSide) {
    throw badRequest(`At most ${rules.playersPerSide} players per side`, 'XI_TOO_LARGE');
  }

  const roster = await prisma.teamPlayer.findMany({
    where: { teamId: input.teamId, playerId: { in: ids } },
    select: { playerId: true },
  });
  if (roster.length !== ids.length) {
    throw badRequest('Every player must be in the team squad', 'PLAYER_NOT_IN_SQUAD');
  }

  // A player cannot play for both sides.
  const otherTeamId = input.teamId === match.teamAId ? match.teamBId : match.teamAId;
  const clash = await prisma.matchPlayer.findFirst({
    where: { matchId, teamId: otherTeamId, playerId: { in: ids } },
  });
  if (clash) throw conflict('A player is already in the other team XI', 'PLAYER_IN_BOTH_TEAMS');

  await prisma.$transaction(async (tx) => {
    await tx.matchPlayer.deleteMany({ where: { matchId, teamId: input.teamId } });
    await tx.matchPlayer.createMany({
      data: ids.map((playerId, i) => ({ matchId, teamId: input.teamId, playerId, battingPosition: i + 1 })),
    });
  });
  return getMatchView(matchId);
}

export async function recordToss(matchId: string, userId: string, input: TossInput) {
  const match = await assertCanScore(matchId, userId);
  if (!isPreMatch(match.status)) throw conflict('The match has already started', 'MATCH_STARTED');
  if (!match.teamAId || !match.teamBId) throw conflict('Both teams must be decided first', 'TEAMS_NOT_SET');
  if (input.winnerTeamId !== match.teamAId && input.winnerTeamId !== match.teamBId) {
    throw badRequest('Toss winner must be one of the two teams', 'TEAM_NOT_IN_MATCH');
  }
  await prisma.match.update({
    where: { id: matchId },
    data: { tossWinnerId: input.winnerTeamId, tossDecision: input.decision, status: 'toss' },
  });
  liveBus.matchStatus({ matchId, status: 'toss' });
  return getMatchView(matchId);
}

export async function scheduleMatch(matchId: string, userId: string, input: ScheduleMatchInput) {
  const match = await assertCanScore(matchId, userId);
  if (!isPreMatch(match.status)) throw conflict('The match has already started', 'MATCH_STARTED');
  await prisma.match.update({
    where: { id: matchId },
    data: {
      scheduledDate: fromDateOnly(input.scheduledDate),
      scheduledTime: input.scheduledTime,
      ground: input.ground ?? null,
    },
  });
  return getMatchView(matchId);
}

export interface CloseMatchInput {
  outcome: 'abandoned' | 'no_result' | 'walkover';
  winnerTeamId?: string;
  note?: string;
}

/** End a match without a normal result: rain, bad light, a team did not turn up. */
export async function closeMatch(matchId: string, userId: string, input: CloseMatchInput) {
  const match = await assertCanScore(matchId, userId);
  if (match.status === 'completed' || match.status === 'abandoned' || match.status === 'no_result' || match.status === 'walkover') {
    throw conflict('The match is already finished', 'MATCH_FINISHED');
  }
  if (input.outcome === 'walkover') {
    if (!input.winnerTeamId || (input.winnerTeamId !== match.teamAId && input.winnerTeamId !== match.teamBId)) {
      throw badRequest('A walkover needs the winning team', 'WINNER_REQUIRED');
    }
  }
  const winner = input.outcome === 'walkover' ? (input.winnerTeamId ?? null) : null;
  const text =
    input.note ??
    (input.outcome === 'walkover' ? 'Walkover' : input.outcome === 'abandoned' ? 'Match abandoned' : 'No result');

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: input.outcome,
      resultType: input.outcome,
      winnerId: winner,
      resultText: text,
      activeScorerId: null,
      scorerLockedAt: null,
    },
  });
  liveBus.matchStatus({ matchId, status: input.outcome });
  await afterMatchFinished(matchId);
  return getMatchView(matchId);
}
