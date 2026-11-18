import { GROUP_COUNTS, matchRulesSchema, type CreateNoticeInput, type UpdateTournamentInput } from '@cricket/shared';
import { prisma } from '../../db/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { toJson } from '../../lib/json';
import { advanceTournament, assertOrganiser } from './tournaments.service';

/** Matches that have not started yet; their rules can still change. */
const PRE_MATCH = ['scheduled', 'toss'];

/**
 * Organiser edits after creation.
 * - Draft: anything (teams, groups, rules, points...).
 * - Live / paused: name, points, tiebreakers, and match rules. New rules reach only matches that have not started;
 *   matches in progress or finished keep the rules they were played under.
 * - Completed: name only.
 */
export async function updateTournament(tournamentId: string, userId: string, input: UpdateTournamentInput) {
  const t = await assertOrganiser(tournamentId, userId);
  const draft = t.status === 'draft';

  if (t.status === 'completed' && Object.keys(input).some((k) => k !== 'name' && input[k as keyof UpdateTournamentInput] !== undefined)) {
    throw conflict('A completed tournament can only be renamed', 'TOURNAMENT_COMPLETED');
  }
  if (!draft && (input.teamCount !== undefined || input.groupCount !== undefined || input.doubleRoundRobin !== undefined)) {
    throw conflict('Team count, groups and round-robin type are locked once fixtures exist', 'FIXTURES_EXIST');
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.points !== undefined) data.points = toJson(input.points);
  if (input.tiebreakers !== undefined) data.tiebreakers = input.tiebreakers;
  if (input.doubleRoundRobin !== undefined) data.doubleRoundRobin = input.doubleRoundRobin;
  if (input.rules !== undefined) data.rules = toJson(matchRulesSchema.parse(input.rules));

  let resetGroups = false;
  if (draft && (input.teamCount !== undefined || input.groupCount !== undefined)) {
    const teamCount = input.teamCount ?? t.teamCount;
    const entries = await prisma.tournamentTeam.count({ where: { tournamentId } });
    if (teamCount < entries) {
      throw badRequest(`${entries} teams have already joined; remove some first`, 'TEAM_COUNT_TOO_LOW');
    }
    if (t.format === 'league_semi_final' && teamCount < 4) throw badRequest('Semi-finals need 4+ teams', 'TEAM_COUNT_INVALID');
    if (t.format === 'groups_knockout') {
      const groupCount = input.groupCount ?? t.groupCount ?? 0;
      if (!GROUP_COUNTS.includes(groupCount as (typeof GROUP_COUNTS)[number])) {
        throw badRequest('Choose 2, 4 or 8 groups', 'GROUP_COUNT_INVALID');
      }
      if (teamCount < groupCount * 2) {
        throw badRequest(`Need at least ${groupCount * 2} teams for ${groupCount} groups`, 'TEAM_COUNT_INVALID');
      }
      if (input.groupCount !== undefined && input.groupCount !== t.groupCount) {
        data.groupCount = input.groupCount;
        resetGroups = true; // a manual draw no longer fits
      }
    } else if (input.groupCount !== undefined) {
      throw badRequest('Groups only apply to the Groups + Knockout format', 'GROUPS_NOT_APPLICABLE');
    }
    if (input.teamCount !== undefined) data.teamCount = input.teamCount;
  }

  return prisma.$transaction(async (tx) => {
    let updatedMatches = 0;
    if (input.rules !== undefined && !draft) {
      const upcoming = await tx.match.findMany({
        where: { tournamentId, status: { in: PRE_MATCH } },
        select: { id: true },
      });
      const ids = upcoming.map((m: { id: string }) => m.id);
      if (ids.length) {
        const xi = await tx.matchPlayer.findMany({ where: { matchId: { in: ids } }, select: { matchId: true, teamId: true } });
        const sizes = new Map<string, number>();
        for (const p of xi as { matchId: string; teamId: string }[]) {
          const k = `${p.matchId}:${p.teamId}`;
          sizes.set(k, (sizes.get(k) ?? 0) + 1);
        }
        if ([...sizes.values()].some((n) => n > input.rules!.playersPerSide)) {
          throw conflict(
            `Some upcoming matches already have more than ${input.rules.playersPerSide} players in a playing XI. Trim those XIs first.`,
            'XI_TOO_LARGE',
          );
        }
        const res = await tx.match.updateMany({
          where: { tournamentId, status: { in: PRE_MATCH } },
          data: { rules: toJson(matchRulesSchema.parse(input.rules)) },
        });
        updatedMatches = res.count;
      }
    }
    if (resetGroups) await tx.tournamentTeam.updateMany({ where: { tournamentId }, data: { groupName: null } });
    const tournament = await tx.tournament.update({ where: { id: tournamentId }, data });
    return { tournament, updatedMatches };
  });
}

// ---------------------------------------------------------------------------
// Pause / resume and public notices
// ---------------------------------------------------------------------------

/** Public: the incident log, newest first. `active` = not yet resolved. */
export async function listNotices(tournamentId: string) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
  if (!t) throw notFound('Tournament');
  const rows = await prisma.tournamentNotice.findMany({ where: { tournamentId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return rows.map((n: { resolvedAt: Date | null }) => ({ ...n, active: n.resolvedAt == null }));
}

export async function createNotice(tournamentId: string, userId: string, input: CreateNoticeInput) {
  await assertOrganiser(tournamentId, userId);
  if (input.kind === 'paused' || input.kind === 'resumed') {
    throw badRequest('Use pause / resume for that', 'NOTICE_KIND_RESERVED');
  }
  return prisma.tournamentNotice.create({ data: { tournamentId, createdById: userId, ...input } });
}

export async function resolveNotice(tournamentId: string, userId: string, noticeId: string) {
  await assertOrganiser(tournamentId, userId);
  const notice = await prisma.tournamentNotice.findFirst({ where: { id: noticeId, tournamentId } });
  if (!notice) throw notFound('Notice');
  if (notice.kind === 'paused') throw conflict('Resume the tournament to clear this notice', 'USE_RESUME');
  if (notice.resolvedAt) return notice;
  return prisma.tournamentNotice.update({ where: { id: noticeId }, data: { resolvedAt: new Date() } });
}

/** Halt play. Scoring is refused and playoff slots stop filling until the organiser resumes. */
export async function pauseTournament(tournamentId: string, userId: string, input: { reason: string; message: string }) {
  const t = await assertOrganiser(tournamentId, userId);
  if (t.status !== 'live') {
    throw conflict(t.status === 'paused' ? 'Already paused' : 'Only a running tournament can be paused', 'NOT_LIVE');
  }
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'paused' } });
    const notice = await tx.tournamentNotice.create({
      data: { tournamentId, createdById: userId, kind: 'paused', title: input.reason, message: input.message },
    });
    return { tournament, notice };
  });
}

export async function resumeTournament(tournamentId: string, userId: string, input: { message: string }) {
  const t = await assertOrganiser(tournamentId, userId);
  if (t.status !== 'paused') throw conflict('The tournament is not paused', 'NOT_PAUSED');
  const result = await prisma.$transaction(async (tx) => {
    await tx.tournamentNotice.updateMany({
      where: { tournamentId, kind: 'paused', resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    const tournament = await tx.tournament.update({ where: { id: tournamentId }, data: { status: 'live' } });
    const notice = await tx.tournamentNotice.create({
      data: {
        tournamentId,
        createdById: userId,
        kind: 'resumed',
        title: 'Play has resumed',
        message: input.message,
        resolvedAt: new Date(), // history only, not an active banner
      },
    });
    return { tournament, notice };
  });
  // Matches may have finished while paused; fill any playoff slots that are now decided.
  await advanceTournament(tournamentId);
  return result;
}
