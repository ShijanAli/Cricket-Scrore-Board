import {
  pointsConfigSchema,
  schedulerConfigSchema,
  type CreateTournamentInput,
  type Tiebreaker,
} from '@cricket/shared';
import {
  computeStandings,
  generateFixtures,
  scheduleFixtures,
  type FixtureSource,
  type StandingRow,
} from '@cricket/engine';
import { prisma } from '../../db/prisma';
import { isUniqueViolation } from '../../db/errors';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { fromDateOnly } from '../../lib/dates';
import { parseRules, toJson } from '../../lib/json';
import { withDateString } from '../matches/mapper';
import { toOutcome } from './standings';

const FINISHED = ['completed', 'abandoned', 'no_result', 'walkover'];
const isFinished = (status: string) => FINISHED.includes(status);

export async function assertOrganiser(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw notFound('Tournament');
  const member = await prisma.tournamentMember.findFirst({
    where: { tournamentId, userId, role: 'organiser' },
  });
  if (!member) throw forbidden('Only an organiser can do this');
  return tournament;
}

export async function createTournament(userId: string, input: CreateTournamentInput) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        ownerId: userId,
        name: input.name,
        format: input.format,
        teamCount: input.teamCount,
        doubleRoundRobin: input.doubleRoundRobin,
        scheduleMode: input.scheduleMode,
        rules: toJson(input.rules),
        points: toJson(input.points),
        tiebreakers: input.tiebreakers,
        schedulerConfig: input.scheduler ? toJson(input.scheduler) : undefined,
      },
    });
    await tx.tournamentMember.create({ data: { tournamentId: tournament.id, userId, role: 'organiser' } });
    return tournament;
  });
}

export const listMyTournaments = (userId: string) =>
  prisma.tournament.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { teams: true, matches: true } } },
  });

export async function getTournament(id: string) {
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: { include: { team: true }, orderBy: { createdAt: 'asc' } }, members: true },
  });
  if (!t) throw notFound('Tournament');
  return t;
}

// ---------------------------------------------------------------------------
// Teams in a tournament
// ---------------------------------------------------------------------------

export async function addTeam(tournamentId: string, userId: string, teamId: string, seed?: number) {
  const tournament = await assertOrganiser(tournamentId, userId);
  if (tournament.status !== 'draft') throw conflict('Fixtures are already generated', 'FIXTURES_EXIST');

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw notFound('Team');
  if (team.ownerId !== userId) throw forbidden('You can only add teams you own');

  const count = await prisma.tournamentTeam.count({ where: { tournamentId } });
  if (count >= tournament.teamCount) throw conflict('The tournament is full', 'TOURNAMENT_FULL');

  // One team per player per tournament (service-level rule, not a DB constraint).
  const roster = await prisma.teamPlayer.findMany({ where: { teamId }, select: { playerId: true } });
  if (roster.length) {
    const clash = await prisma.teamPlayer.findFirst({
      where: {
        playerId: { in: roster.map((r) => r.playerId) },
        team: { tournamentTeams: { some: { tournamentId } } },
      },
      include: { player: true, team: true },
    });
    if (clash) {
      throw conflict(
        `${clash.player.name} already plays for ${clash.team.name} in this tournament`,
        'PLAYER_IN_OTHER_TEAM',
      );
    }
  }

  try {
    return await prisma.tournamentTeam.create({
      data: { tournamentId, teamId, seed: seed ?? null },
      include: { team: true },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('Team or seed is already used in this tournament', 'DUPLICATE_ENTRY');
    throw e;
  }
}

export async function removeTeam(tournamentId: string, userId: string, teamId: string) {
  const tournament = await assertOrganiser(tournamentId, userId);
  if (tournament.status !== 'draft') throw conflict('Fixtures are already generated', 'FIXTURES_EXIST');
  const res = await prisma.tournamentTeam.deleteMany({ where: { tournamentId, teamId } });
  if (res.count === 0) throw notFound('Team in this tournament');
}

/** Give another user the scorer role for every match of this tournament. */
export async function addScorer(tournamentId: string, userId: string, email: string) {
  await assertOrganiser(tournamentId, userId);
  const scorer = await prisma.user.findUnique({ where: { email } });
  if (!scorer) throw notFound('User with this email');
  try {
    await prisma.tournamentMember.create({ data: { tournamentId, userId: scorer.id, role: 'scorer' } });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e; // already a scorer: fine
  }
  return { userId: scorer.id, name: scorer.name, role: 'scorer' as const };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export async function generateTournamentFixtures(tournamentId: string, userId: string) {
  const tournament = await assertOrganiser(tournamentId, userId);
  if (tournament.status !== 'draft') throw conflict('Fixtures are already generated', 'FIXTURES_EXIST');

  const entries = await prisma.tournamentTeam.findMany({ where: { tournamentId } });
  if (entries.length !== tournament.teamCount) {
    throw badRequest(
      `Add all ${tournament.teamCount} teams first (currently ${entries.length})`,
      'TEAMS_INCOMPLETE',
    );
  }

  // Seed order: explicit seeds first (1 = top), unseeded teams after, in the order they joined.
  const ordered = [...entries].sort((a, b) => {
    const sa = a.seed ?? Number.MAX_SAFE_INTEGER;
    const sb = b.seed ?? Number.MAX_SAFE_INTEGER;
    return sa - sb || a.createdAt.getTime() - b.createdAt.getTime();
  });
  const drafts = generateFixtures(
    ordered.map((e) => e.teamId),
    tournament.format,
    { doubleRoundRobin: tournament.doubleRoundRobin },
  );

  // Dates: automatic from the date range, or left empty for the organiser to set per match.
  const timing = new Map<number, { date: string; time: string; ground: string }>();
  if (tournament.scheduleMode === 'auto') {
    const config = schedulerConfigSchema.parse(tournament.schedulerConfig);
    const result = scheduleFixtures(drafts, config);
    if (result.unscheduled.length > 0) {
      throw new AppError(
        422,
        'SCHEDULE_DOES_NOT_FIT',
        `${result.unscheduled.length} match(es) do not fit in the date range. Extend the dates, add slots or grounds.`,
        { unscheduledMatchNos: result.unscheduled.map((d) => d.matchNo) },
      );
    }
    for (const s of result.scheduled) timing.set(s.matchNo, { date: s.date, time: s.time, ground: s.ground });
  }

  const teamOf = (src: FixtureSource) => (src.kind === 'team' ? src.teamId : null);

  await prisma.$transaction(async (tx) => {
    await tx.match.createMany({
      data: drafts.map((d) => {
        const when = timing.get(d.matchNo);
        return {
          type: 'tournament' as const,
          ownerId: tournament.ownerId,
          tournamentId,
          matchNo: d.matchNo,
          stage: d.stage,
          round: d.round,
          sourceA: toJson(d.a),
          sourceB: toJson(d.b),
          dependsOn: d.dependsOn,
          teamAId: teamOf(d.a),
          teamBId: teamOf(d.b),
          status: 'scheduled' as const,
          scheduledDate: when ? fromDateOnly(when.date) : null,
          scheduledTime: when?.time ?? null,
          ground: when?.ground ?? null,
          rules: toJson(tournament.rules),
        };
      }),
    });
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'live' } });
  });

  return listFixtures(tournamentId);
}

export async function listFixtures(tournamentId: string) {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    orderBy: { matchNo: 'asc' },
    include: { teamA: true, teamB: true },
  });
  return matches.map(withDateString);
}

// ---------------------------------------------------------------------------
// Standings and playoff progression
// ---------------------------------------------------------------------------

async function computeTable(tournament: {
  id: string;
  rules: unknown;
  points: unknown;
  tiebreakers: string[];
}): Promise<StandingRow[]> {
  const rules = parseRules(tournament.rules);
  const [entries, matches] = await Promise.all([
    prisma.tournamentTeam.findMany({ where: { tournamentId: tournament.id } }),
    prisma.match.findMany({
      where: { tournamentId: tournament.id, stage: 'league' },
      include: { innings: true },
    }),
  ]);
  const outcomes = matches.flatMap((m) => {
    const o = toOutcome(m, rules);
    return o ? [o] : [];
  });
  return computeStandings(
    entries.map((e) => e.teamId),
    outcomes,
    {
      points: pointsConfigSchema.parse(tournament.points),
      tiebreakers: tournament.tiebreakers as Tiebreaker[],
      ballsPerOver: rules.ballsPerOver,
    },
  );
}

export async function getStandings(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw notFound('Tournament');
  const table = await computeTable(tournament);
  const teams = await prisma.team.findMany({ where: { id: { in: table.map((r) => r.teamId) } } });
  const byId = new Map(teams.map((t) => [t.id, t]));
  return table.map((row) => ({ ...row, team: byId.get(row.teamId) ?? null }));
}

/**
 * Fill TBD playoff slots ("1st vs 2nd", "winner of match 7") once their source is decided, and
 * close the tournament when everything is finished. Safe to call any time: it only fills empty slots.
 */
export async function advanceTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status !== 'live') return;

  const matches = await prisma.match.findMany({ where: { tournamentId }, orderBy: { matchNo: 'asc' } });
  const league = matches.filter((m) => m.stage === 'league');
  const leagueDone = league.length > 0 && league.every((m) => isFinished(m.status));
  const table = leagueDone ? await computeTable(tournament) : null;

  for (const m of matches) {
    if (isFinished(m.status)) continue;
    const patch: { teamAId?: string; teamBId?: string } = {};
    const slots: ['teamAId' | 'teamBId', FixtureSource | null, string | null][] = [
      ['teamAId', m.sourceA as unknown as FixtureSource | null, m.teamAId],
      ['teamBId', m.sourceB as unknown as FixtureSource | null, m.teamBId],
    ];
    for (const [field, source, current] of slots) {
      if (current || !source) continue;
      if (source.kind === 'standing' && table) {
        const row = table[source.position - 1];
        if (row) patch[field] = row.teamId;
      } else if (source.kind === 'winnerOf') {
        const dep = matches.find((x) => x.matchNo === source.matchNo);
        if (dep && isFinished(dep.status) && dep.winnerId) patch[field] = dep.winnerId;
      }
    }
    if (patch.teamAId || patch.teamBId) {
      await prisma.match.update({ where: { id: m.id }, data: patch });
    }
  }

  if (matches.every((m) => isFinished(m.status))) {
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: 'completed' } });
  }
}
