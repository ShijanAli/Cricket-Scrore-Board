import { randomUUID } from 'node:crypto';
import type {
  AddSquadPlayerInput,
  AddSquadPlayersBulkInput,
  CreatePlayerInput,
  CreateTeamInput,
  UpdateTeamInput,
} from '@cricket/shared';
import { prisma } from '../../db/prisma';
import { isForeignKeyViolation, isUniqueViolation } from '../../db/errors';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';

const MAX_SQUAD = 25;

const rosterInclude = {
  roster: { include: { player: true }, orderBy: { createdAt: 'asc' as const } },
} as const;

export async function assertTeamOwner(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw notFound('Team');
  if (team.ownerId !== userId) throw forbidden('This team belongs to someone else');
  return team;
}

export async function createTeam(userId: string, input: CreateTeamInput) {
  try {
    return await prisma.team.create({ data: { ...input, ownerId: userId } });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('You already have a team with this name', 'TEAM_NAME_TAKEN');
    throw e;
  }
}

export const listMyTeams = (userId: string) =>
  prisma.team.findMany({
    where: { ownerId: userId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { roster: true } } },
  });

export async function getTeam(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: rosterInclude });
  if (!team) throw notFound('Team');
  return team;
}

export async function updateTeam(teamId: string, userId: string, input: UpdateTeamInput) {
  await assertTeamOwner(teamId, userId);
  try {
    return await prisma.team.update({ where: { id: teamId }, data: input });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('You already have a team with this name', 'TEAM_NAME_TAKEN');
    throw e;
  }
}

export async function deleteTeam(teamId: string, userId: string) {
  await assertTeamOwner(teamId, userId);
  try {
    await prisma.team.delete({ where: { id: teamId } });
  } catch (e) {
    // Matches / tournaments reference the team (onDelete: Restrict).
    if (isForeignKeyViolation(e)) {
      throw conflict('This team is used in a match or tournament and cannot be deleted', 'TEAM_IN_USE');
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Players and squads
// ---------------------------------------------------------------------------

export const createPlayer = (userId: string, input: CreatePlayerInput) =>
  prisma.player.create({ data: { ...input, createdById: userId } });

export const listMyPlayers = (userId: string, q?: string) =>
  prisma.player.findMany({
    where: {
      createdById: userId,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
    take: 100,
  });

/**
 * Adds a player to a squad. Every database round trip is slow when the database is remote, so this
 * keeps it to two: the checks run together, then one write (a brand new player is created in the same
 * statement as its squad row).
 */
export async function addToSquad(teamId: string, userId: string, input: AddSquadPlayerInput) {
  if (!input.playerId && !input.newPlayer) throw badRequest('Provide either playerId or newPlayer');

  const [team, size, existing] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamPlayer.count({ where: { teamId } }),
    input.playerId ? prisma.player.findUnique({ where: { id: input.playerId } }) : Promise.resolve(null),
  ]);
  if (!team) throw notFound('Team');
  if (team.ownerId !== userId) throw forbidden('This team belongs to someone else');
  if (size >= MAX_SQUAD) throw badRequest(`A squad can have at most ${MAX_SQUAD} players`, 'SQUAD_FULL');
  if (input.playerId) {
    if (!existing) throw notFound('Player');
    if (existing.createdById !== userId) throw forbidden('You can only add players you created');
  }

  try {
    return await prisma.teamPlayer.create({
      data: {
        team: { connect: { id: teamId } },
        player: input.playerId
          ? { connect: { id: input.playerId } }
          : { create: { ...input.newPlayer!, createdById: userId } },
        isCaptain: input.isCaptain,
        isViceCaptain: input.isViceCaptain,
        isWicketkeeper: input.isWicketkeeper,
      },
      include: { player: true },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Player is already in this squad', 'ALREADY_IN_SQUAD');
    throw e;
  }
}

/**
 * Creates several guest players and puts them all in a squad at once. Ids are generated here so the
 * players and the squad rows go in as two bulk inserts inside one transaction, all-or-nothing.
 */
export async function addManyToSquad(teamId: string, userId: string, input: AddSquadPlayersBulkInput) {
  const [team, size] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamPlayer.count({ where: { teamId } }),
  ]);
  if (!team) throw notFound('Team');
  if (team.ownerId !== userId) throw forbidden('This team belongs to someone else');
  if (size + input.players.length > MAX_SQUAD) {
    throw badRequest(`A squad can have at most ${MAX_SQUAD} players`, 'SQUAD_FULL');
  }

  const rows = input.players.map((p) => ({ id: randomUUID(), p }));
  await prisma.$transaction([
    prisma.player.createMany({
      data: rows.map(({ id, p }) => ({
        id,
        name: p.name,
        role: p.role,
        phone: p.phone,
        jerseyNumber: p.jerseyNumber,
        createdById: userId,
      })),
    }),
    prisma.teamPlayer.createMany({
      data: rows.map(({ id, p }) => ({
        teamId,
        playerId: id,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
        isWicketkeeper: p.isWicketkeeper,
      })),
    }),
  ]);

  return rows.map(({ id, p }) => ({
    teamId,
    playerId: id,
    isCaptain: p.isCaptain,
    isViceCaptain: p.isViceCaptain,
    isWicketkeeper: p.isWicketkeeper,
    player: {
      id,
      name: p.name,
      phone: p.phone ?? null,
      role: p.role,
      jerseyNumber: p.jerseyNumber ?? null,
    },
  }));
}

export async function removeFromSquad(teamId: string, userId: string, playerId: string) {
  await assertTeamOwner(teamId, userId);
  const res = await prisma.teamPlayer.deleteMany({ where: { teamId, playerId } });
  if (res.count === 0) throw notFound('Player in this squad');
}
