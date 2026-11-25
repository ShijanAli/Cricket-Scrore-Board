import type { IngestEventsInput, InningsSetup, InningsState, MatchStatus } from '@cricket/shared';
import { createInnings, describeResult } from '@cricket/engine';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { isUniqueViolation } from '../../db/errors';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { isUuid } from '../../lib/ids';
import { asInnings, parseEvent, parseRules, toJson } from '../../lib/json';
import { liveBus } from '../live/live-bus';
import { assertCanScore, assertTournamentNotPaused } from './access';
import { afterMatchFinished } from './after-match';
import { planIngest } from './ingest';
import { getMatchView, invalidateMatchView } from './matches.service';
import { deriveProgress } from './progress';

const FINISHED = ['completed', 'abandoned', 'no_result', 'walkover'] as const;
const isFinished = (status: string) => (FINISHED as readonly string[]).includes(status);

// ---------------------------------------------------------------------------
// Scorer lock: one scorer at a time, expires if the scorer goes silent.
// ---------------------------------------------------------------------------

const staleBefore = () => new Date(Date.now() - env.SCORER_LOCK_TTL_SECONDS * 1000);

/**
 * Atomic compare-and-set: succeeds when nobody holds the lock, we hold it, or the holder went
 * silent. Two scorers tapping at the same moment cannot both win.
 */
async function acquireLock(
  match: { id: string; activeScorerId: string | null; scorerLockedAt?: Date | null },
  userId: string,
) {
  // Already ours and refreshed recently: nothing to write. Refresh only once a third of the TTL has passed,
  // which saves a database round trip on almost every ball and still keeps the lock alive.
  if (match.activeScorerId === userId && match.scorerLockedAt && Date.now() - match.scorerLockedAt.getTime() < (env.SCORER_LOCK_TTL_SECONDS * 1000) / 3) {
    return;
  }
  const res = await prisma.match.updateMany({
    where: {
      id: match.id,
      OR: [{ activeScorerId: null }, { activeScorerId: userId }, { scorerLockedAt: { lt: staleBefore() } }],
    },
    data: { activeScorerId: userId, scorerLockedAt: new Date() },
  });
  if (res.count !== 1) {
    throw conflict('Another scorer is scoring this match', 'SCORER_LOCKED', {
      scorerUserId: match.activeScorerId,
    });
  }
  if (match.activeScorerId !== userId) {
    liveBus.scorerChanged({ matchId: match.id, scorerUserId: userId });
  }
}

export async function lockScorer(matchId: string, userId: string) {
  const match = await assertCanScore(matchId, userId);
  if (isFinished(match.status)) throw conflict('The match is already finished', 'MATCH_FINISHED');
  await acquireLock(match, userId);
  return { scorerUserId: userId };
}

export async function releaseScorer(matchId: string, userId: string) {
  const res = await prisma.match.updateMany({
    where: { id: matchId, activeScorerId: userId },
    data: { activeScorerId: null, scorerLockedAt: null },
  });
  if (res.count === 1) liveBus.scorerChanged({ matchId, scorerUserId: null });
}

// ---------------------------------------------------------------------------
// Start an innings
// ---------------------------------------------------------------------------

export async function startInnings(matchId: string, userId: string, setup: InningsSetup) {
  const match = await assertCanScore(matchId, userId);
  if (isFinished(match.status)) throw conflict('The match is already finished', 'MATCH_FINISHED');
  if (!match.teamAId || !match.teamBId) throw conflict('Both teams must be decided first', 'TEAMS_NOT_SET');
  if (!match.tossWinnerId || !match.tossDecision) throw conflict('Record the toss first', 'TOSS_REQUIRED');

  const inningsNo = match.currentInningsNo + 1;
  if (inningsNo > 2) throw conflict('Both innings have already started', 'INNINGS_EXISTS');

  // Who bats first follows from the toss. Never trust the phone for this.
  const tossWinner = match.tossWinnerId;
  const tossLoser = tossWinner === match.teamAId ? match.teamBId : match.teamAId;
  const firstBat = match.tossDecision === 'bat' ? tossWinner : tossLoser;
  const firstBowl = match.tossDecision === 'bat' ? tossLoser : tossWinner;
  const expected = inningsNo === 1 ? { bat: firstBat, bowl: firstBowl } : { bat: firstBowl, bowl: firstBat };
  if (setup.battingTeamId !== expected.bat || setup.bowlingTeamId !== expected.bowl) {
    throw badRequest('Wrong batting side for this innings', 'WRONG_BATTING_TEAM');
  }

  const players = await prisma.matchPlayer.findMany({ where: { matchId } });
  const batXI = new Set(players.filter((p) => p.teamId === expected.bat).map((p) => p.playerId));
  const bowlXI = new Set(players.filter((p) => p.teamId === expected.bowl).map((p) => p.playerId));
  if (batXI.size < 2 || bowlXI.size < 1) throw conflict('Select both playing XIs first', 'XI_REQUIRED');
  if (!batXI.has(setup.strikerId) || !batXI.has(setup.nonStrikerId)) {
    throw badRequest('Openers must be in the batting XI', 'PLAYER_NOT_IN_XI');
  }
  if (!bowlXI.has(setup.bowlerId)) throw badRequest('Bowler must be in the bowling XI', 'PLAYER_NOT_IN_XI');

  let target: number | null = null;
  if (inningsNo === 2) {
    const first = await prisma.innings.findUnique({ where: { matchId_inningsNo: { matchId, inningsNo: 1 } } });
    const firstState = first ? asInnings(first.snapshot) : null;
    if (!firstState || firstState.status !== 'completed') {
      throw conflict('The first innings is not finished', 'INNINGS_NOT_FINISHED');
    }
    target = firstState.runs + 1;
  }

  const state = createInnings(setup, parseRules(match.rules), target);

  try {
    await prisma.$transaction(async (tx) => {
      // Compare-and-set on currentInningsNo: a double tap cannot start the innings twice.
      const claimed = await tx.match.updateMany({
        where: { id: matchId, currentInningsNo: match.currentInningsNo },
        data: { currentInningsNo: inningsNo, status: 'live' },
      });
      if (claimed.count !== 1) throw conflict('The innings was already started', 'INNINGS_EXISTS');
      await tx.innings.create({
        data: {
          matchId,
          inningsNo,
          battingTeamId: setup.battingTeamId,
          bowlingTeamId: setup.bowlingTeamId,
          strikerId: setup.strikerId,
          nonStrikerId: setup.nonStrikerId,
          bowlerId: setup.bowlerId,
          target,
          snapshot: toJson(state),
        },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('The innings was already started', 'INNINGS_EXISTS');
    throw e;
  }

  liveBus.matchStatus({ matchId, status: 'live' });
  liveBus.scoreUpdated({ matchId, inningsNo, innings: state, lastSeq: 0 });
  return getMatchView(matchId);
}

// ---------------------------------------------------------------------------
// Ingest ball events (idempotent, re-verified by the engine)
// ---------------------------------------------------------------------------

export interface IngestResult {
  accepted: number;
  duplicates: string[];
  lastSeq: number;
  innings: InningsState;
  matchStatus: string;
  resultText: string | null;
}

export async function ingestEvents(
  matchId: string,
  userId: string,
  input: IngestEventsInput,
): Promise<IngestResult> {
  const match = await assertCanScore(matchId, userId);
  if (isFinished(match.status) && match.status !== 'completed') {
    throw conflict('The match is already finished', 'MATCH_FINISHED');
  }
  if (input.inningsNo > match.currentInningsNo) {
    throw conflict('This innings has not started', 'INNINGS_NOT_STARTED');
  }
  if (input.inningsNo < match.currentInningsNo) {
    throw conflict('An earlier innings is locked once the next one starts', 'INNINGS_LOCKED');
  }
  if (input.events.some((e) => !isUuid(e.id))) {
    throw badRequest('Every event id must be a UUID', 'INVALID_EVENT_ID');
  }

  // Independent checks and reads run together instead of one after another.
  const [, , players, firstInningsRow] = await Promise.all([
    assertTournamentNotPaused(match.tournamentId),
    acquireLock(match, userId),
    prisma.matchPlayer.findMany({ where: { matchId } }), // the XI is fixed once the match starts
    input.inningsNo === 2 ? prisma.innings.findUnique({ where: { matchId_inningsNo: { matchId, inningsNo: 1 } } }) : Promise.resolve(null),
  ]);

  const result = await prisma.$transaction(
    async (tx) => {
      // Serialise writers on this innings. The scorer lock makes contention rare, this makes it safe.
      await tx.$queryRaw`SELECT id FROM innings WHERE "matchId" = ${matchId}::uuid AND "inningsNo" = ${input.inningsNo} FOR UPDATE`;

      const innings = await tx.innings.findUnique({
        where: { matchId_inningsNo: { matchId, inningsNo: input.inningsNo } },
      });
      if (!innings) throw notFound('Innings');

      const rows = await tx.ballEvent.findMany({ where: { inningsId: innings.id }, orderBy: { seq: 'asc' } });
      const existing = rows.map((r) => parseEvent(r.payload));
      const lastSeq = rows.length ? rows[rows.length - 1]!.seq : 0;

      const xi = (teamId: string) => new Set(players.filter((p) => p.teamId === teamId).map((p) => p.playerId));

      const plan = planIngest({
        setup: {
          battingTeamId: innings.battingTeamId,
          bowlingTeamId: innings.bowlingTeamId,
          strikerId: innings.strikerId,
          nonStrikerId: innings.nonStrikerId,
          bowlerId: innings.bowlerId,
        },
        rules: parseRules(match.rules),
        target: innings.target,
        existing,
        incoming: input.events,
        lastSeq,
        battingXI: xi(innings.battingTeamId),
        bowlingXI: xi(innings.bowlingTeamId),
      });

      // Nothing new (a retried sync): answer from the stored state, write nothing.
      if (plan.toInsert.length === 0) {
        return {
          accepted: 0,
          duplicates: plan.duplicateIds,
          lastSeq,
          innings: plan.state,
          matchStatus: match.status,
          resultText: match.resultText,
          statusChanged: false,
        };
      }

      await tx.ballEvent.createMany({
        data: plan.toInsert.map(({ event, seq }) => ({
          id: event.id,
          inningsId: innings.id,
          seq,
          type: event.type,
          payload: toJson(event),
          createdById: userId,
        })),
      });
      const newLastSeq = plan.toInsert[plan.toInsert.length - 1]!.seq;
      const state = plan.state;

      await tx.innings.update({
        where: { id: innings.id },
        data: {
          lastSeq: newLastSeq,
          snapshot: toJson(state),
          status: state.status,
          // An undo can re-open a finished innings, so this can go back to null.
          completedAt: state.status === 'completed' ? (innings.completedAt ?? new Date()) : null,
        },
      });

      // Match status/result follow from the innings states.
      let first: InningsState | null = state;
      let second: InningsState | null = null;
      if (input.inningsNo === 2) {
        first = firstInningsRow ? asInnings(firstInningsRow.snapshot) : null;
        second = state;
      }
      const progress = deriveProgress(first, second);

      let resultText: string | null = null;
      const done = progress.result;
      if (done) {
        const teams = await tx.team.findMany({
          where: { id: { in: [innings.battingTeamId, innings.bowlingTeamId] } },
        });
        const names = new Map(teams.map((t) => [t.id, t.name]));
        resultText = describeResult(done, (id) => names.get(id) ?? 'Team');
      }

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: progress.status,
          resultType: done ? done.type : null,
          winnerId: done ? done.winnerTeamId : null,
          resultMargin: done ? done.margin : null,
          resultText,
          // A finished match frees the scorer.
          ...(progress.status === 'completed' ? { activeScorerId: null, scorerLockedAt: null } : {}),
        },
      });

      return {
        accepted: plan.toInsert.length,
        duplicates: plan.duplicateIds,
        lastSeq: newLastSeq,
        innings: state,
        matchStatus: progress.status,
        resultText,
        statusChanged: progress.status !== match.status,
      };
    },
    { timeout: 15_000 },
  );

  // Realtime goes out only after the commit, so viewers never see data that was rolled back.
  if (result.accepted > 0) {
    invalidateMatchView(matchId);
    liveBus.scoreUpdated({
      matchId,
      inningsNo: input.inningsNo,
      innings: result.innings,
      lastSeq: result.lastSeq,
    });
    if (result.statusChanged) {
      liveBus.matchStatus({ matchId, status: result.matchStatus as MatchStatus });
      if (result.matchStatus === 'completed') {
        liveBus.scorerChanged({ matchId, scorerUserId: null });
        await afterMatchFinished(matchId);
      }
    }
  }

  const { statusChanged: _statusChanged, ...response } = result;
  return response;
}

/** Public: the stored event log, for replay on a viewer's phone. */
export async function listEvents(matchId: string, inningsNo: number, afterSeq: number) {
  const innings = await prisma.innings.findUnique({ where: { matchId_inningsNo: { matchId, inningsNo } } });
  if (!innings) throw notFound('Innings');
  const rows = await prisma.ballEvent.findMany({
    where: { inningsId: innings.id, seq: { gt: afterSeq } },
    orderBy: { seq: 'asc' },
    take: 1000,
  });
  return { inningsNo, lastSeq: innings.lastSeq, events: rows.map((r) => ({ seq: r.seq, ...parseEvent(r.payload) })) };
}
