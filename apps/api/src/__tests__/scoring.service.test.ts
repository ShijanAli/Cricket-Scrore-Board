import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deliveryEventSchema,
  matchRulesSchema,
  type BallEvent,
  type DeliveryEventInput,
  type InningsSetup,
  type InningsState,
  type MatchStatus,
  type ScoreUpdatedPayload,
} from '@cricket/shared';
import { replayInnings } from '@cricket/engine';
import { AppError } from '../lib/errors';
import { liveBus } from '../modules/live/live-bus';
import { createFakePrisma, type FakePrisma } from './fake-prisma';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../db/prisma', () => ({
  get prisma() {
    return h.db;
  },
}));

// Imported after the mock is registered.
const matchesSvc = await import('../modules/matches/matches.service');
const scoring = await import('../modules/matches/scoring.service');

const rules = matchRulesSchema.parse({ oversPerInnings: 1, playersPerSide: 3 }); // 6 balls, 2 wickets end it

const owner = randomUUID();
const stranger = randomUUID();
const otherScorer = randomUUID();
const teamA = randomUUID();
const teamB = randomUUID();
const matchId = randomUUID();
const A = [randomUUID(), randomUUID(), randomUUID()];
const B = [randomUUID(), randomUUID(), randomUUID()];

let db: FakePrisma;
let status: { matchId: string; status: MatchStatus }[];
let scores: ScoreUpdatedPayload[];
let scorerChanges: (string | null)[];

beforeEach(() => {
  db = createFakePrisma();
  h.db = db;
  db.table('team').rows.push(
    { id: teamA, name: 'Team A', ownerId: owner },
    { id: teamB, name: 'Team B', ownerId: owner },
  );
  db.table('match').rows.push({
    id: matchId, type: 'single', ownerId: owner, teamAId: teamA, teamBId: teamB,
    status: 'scheduled', rules, currentInningsNo: 0, activeScorerId: null, scorerLockedAt: null,
    tossWinnerId: null, tossDecision: null, tournamentId: null, seriesId: null,
    resultType: null, winnerId: null, resultMargin: null, resultText: null, scheduledDate: null,
  });
  A.forEach((playerId, i) => db.table('matchPlayer').rows.push({ matchId, teamId: teamA, playerId, battingPosition: i + 1 }));
  B.forEach((playerId, i) => db.table('matchPlayer').rows.push({ matchId, teamId: teamB, playerId, battingPosition: i + 1 }));

  status = [];
  scores = [];
  scorerChanges = [];
  liveBus.attach({
    scoreUpdated: (p) => scores.push(p),
    matchStatus: (p) => status.push(p),
    scorerChanged: (p) => scorerChanges.push(p.scorerUserId),
  });
});

const matchRow = () => db.table('match').rows[0]!;
const firstSetup: InningsSetup = { battingTeamId: teamA, bowlingTeamId: teamB, strikerId: A[0]!, nonStrikerId: A[1]!, bowlerId: B[0]! };
const secondSetup: InningsSetup = { battingTeamId: teamB, bowlingTeamId: teamA, strikerId: B[0]!, nonStrikerId: B[1]!, bowlerId: A[0]! };

/** Builds ball events the way the phone does, from the replayed state. */
class Scorer {
  events: BallEvent[] = [];
  constructor(private setup: InningsSetup, private target: number | null = null) {}
  state = (): InningsState => replayInnings(this.setup, rules, this.events, this.target);
  ball(input: Partial<DeliveryEventInput> = {}): BallEvent {
    const s = this.state();
    const e = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: s.strikerId, bowlerId: s.bowlerId, runs: 0, ...input,
    });
    this.events.push(e);
    return e;
  }
}

async function toTossAndFirstInnings() {
  await scoring.lockScorer(matchId, owner);
  await matchesSvc.recordToss(matchId, owner, { winnerTeamId: teamA, decision: 'bat' });
  await scoring.startInnings(matchId, owner, firstSetup);
}

const failure = async (p: Promise<unknown>): Promise<AppError> => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error('expected a rejection');
};

describe('toss and innings setup', () => {
  it('records the toss and moves the match to "toss"', async () => {
    await matchesSvc.recordToss(matchId, owner, { winnerTeamId: teamA, decision: 'bat' });
    expect(matchRow()).toMatchObject({ status: 'toss', tossWinnerId: teamA, tossDecision: 'bat' });
  });

  it('rejects a toss winner that is not playing', async () => {
    const err = await failure(matchesSvc.recordToss(matchId, owner, { winnerTeamId: randomUUID(), decision: 'bat' }));
    expect(err.code).toBe('TEAM_NOT_IN_MATCH');
  });

  it('only the owner (or tournament staff) may manage the match', async () => {
    const err = await failure(matchesSvc.recordToss(matchId, stranger, { winnerTeamId: teamA, decision: 'bat' }));
    expect(err.status).toBe(403);
  });

  it('needs the toss before an innings can start', async () => {
    const err = await failure(scoring.startInnings(matchId, owner, firstSetup));
    expect(err.code).toBe('TOSS_REQUIRED');
  });

  it('takes the batting side from the toss, never from the phone', async () => {
    await matchesSvc.recordToss(matchId, owner, { winnerTeamId: teamA, decision: 'bowl' });
    const err = await failure(scoring.startInnings(matchId, owner, firstSetup)); // A is set to bat, but chose to bowl
    expect(err.code).toBe('WRONG_BATTING_TEAM');
  });

  it('openers and bowler must be in their XIs', async () => {
    await matchesSvc.recordToss(matchId, owner, { winnerTeamId: teamA, decision: 'bat' });
    const err = await failure(scoring.startInnings(matchId, owner, { ...firstSetup, bowlerId: A[2]! }));
    expect(err.code).toBe('PLAYER_NOT_IN_XI');
  });

  it('starts the first innings: live, snapshot stored, viewers told', async () => {
    await toTossAndFirstInnings();
    expect(matchRow()).toMatchObject({ status: 'live', currentInningsNo: 1 });
    const innings = db.table('innings').rows[0]!;
    expect(innings).toMatchObject({ inningsNo: 1, battingTeamId: teamA, target: null });
    expect((innings.snapshot as InningsState).strikerId).toBe(A[0]);
    expect(status.at(-1)).toEqual({ matchId, status: 'live' });
    expect(scores).toHaveLength(1);
  });

  it('a second start of the same innings is refused', async () => {
    await toTossAndFirstInnings();
    const err = await failure(scoring.startInnings(matchId, owner, secondSetup));
    expect(err.code).toBe('INNINGS_NOT_FINISHED');
  });

  it('playing XI: must come from the squad, no duplicates, not on both sides', async () => {
    db.table('matchPlayer').rows.length = 0;
    const squad = [randomUUID(), randomUUID(), randomUUID()];
    squad.forEach((playerId) => db.table('teamPlayer').rows.push({ teamId: teamA, playerId }));

    expect((await failure(matchesSvc.setPlayingXI(matchId, owner, { teamId: teamA, playerIds: [squad[0]!, randomUUID()] }))).code)
      .toBe('PLAYER_NOT_IN_SQUAD');
    expect((await failure(matchesSvc.setPlayingXI(matchId, owner, { teamId: teamA, playerIds: [squad[0]!, squad[0]!] }))).code)
      .toBe('DUPLICATE_PLAYER');

    await matchesSvc.setPlayingXI(matchId, owner, { teamId: teamA, playerIds: squad });
    expect(db.table('matchPlayer').rows.map((r) => r.battingPosition)).toEqual([1, 2, 3]);

    squad.forEach((playerId) => db.table('teamPlayer').rows.push({ teamId: teamB, playerId }));
    expect((await failure(matchesSvc.setPlayingXI(matchId, owner, { teamId: teamB, playerIds: [squad[0]!, squad[1]!] }))).code)
      .toBe('PLAYER_IN_BOTH_TEAMS');
  });
});

describe('ingestEvents', () => {
  beforeEach(toTossAndFirstInnings);

  it('stores events, updates the snapshot and broadcasts after commit', async () => {
    const s = new Scorer(firstSetup);
    s.ball({ runs: 1 });
    s.ball({ runs: 4, boundary: true });
    scores.length = 0;

    const res = await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: s.events });
    expect(res).toMatchObject({ accepted: 2, duplicates: [], lastSeq: 2, matchStatus: 'live' });
    expect(res.innings.runs).toBe(5);
    expect(db.table('ballEvent').rows.map((r) => r.seq)).toEqual([1, 2]);
    expect(db.table('innings').rows[0]).toMatchObject({ lastSeq: 2, status: 'inProgress' });
    expect(scores).toEqual([{ matchId, inningsNo: 1, innings: res.innings, lastSeq: 2 }]);
  });

  it('is idempotent: a retried batch changes nothing and broadcasts nothing', async () => {
    const s = new Scorer(firstSetup);
    s.ball({ runs: 2 });
    s.ball({ runs: 1 });
    await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: s.events });
    scores.length = 0;

    const retry = await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: s.events });
    expect(retry.accepted).toBe(0);
    expect(retry.duplicates).toHaveLength(2);
    expect(retry.lastSeq).toBe(2);
    expect(retry.innings.runs).toBe(3);
    expect(db.table('ballEvent').rows).toHaveLength(2);
    expect(scores).toEqual([]);
  });

  it('rejects a bad batch atomically: nothing stored, nothing broadcast', async () => {
    const s = new Scorer(firstSetup);
    const good = s.ball({ runs: 1 });
    const bad = deliveryEventSchema.parse({ id: randomUUID(), type: 'delivery', strikerId: A[2], bowlerId: B[0], runs: 0 });
    scores.length = 0;

    const err = await failure(scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: [good, bad] }));
    expect(err).toMatchObject({ status: 422, code: 'STRIKER_MISMATCH' });
    expect(db.table('ballEvent').rows).toHaveLength(0);
    expect(db.table('innings').rows[0]!.lastSeq).toBe(0);
    expect(scores).toEqual([]);
  });

  it('refuses non-uuid event ids before touching the database', async () => {
    const s = new Scorer(firstSetup);
    s.ball();
    const events = s.events.map((e) => ({ ...e, id: 'not-a-uuid' })) as BallEvent[];
    expect((await failure(scoring.ingestEvents(matchId, owner, { inningsNo: 1, events }))).code).toBe('INVALID_EVENT_ID');
  });

  it('refuses an innings that has not started', async () => {
    const s = new Scorer(secondSetup, 5);
    s.ball();
    const err = await failure(scoring.ingestEvents(matchId, owner, { inningsNo: 2, events: s.events }));
    expect(err.code).toBe('INNINGS_NOT_STARTED');
  });

  it('refuses people who may not score', async () => {
    const s = new Scorer(firstSetup);
    s.ball();
    expect((await failure(scoring.ingestEvents(matchId, stranger, { inningsNo: 1, events: s.events }))).status).toBe(403);
  });

  it('one scorer at a time: a fresh lock held by someone else blocks, a stale one does not', async () => {
    const s = new Scorer(firstSetup);
    s.ball({ runs: 1 });
    Object.assign(matchRow(), { activeScorerId: otherScorer, scorerLockedAt: new Date() });
    const blocked = await failure(scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: s.events }));
    expect(blocked).toMatchObject({ status: 409, code: 'SCORER_LOCKED' });
    expect(db.table('ballEvent').rows).toHaveLength(0);

    matchRow().scorerLockedAt = new Date(Date.now() - 10 * 60 * 1000); // silent for 10 minutes
    const ok = await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: s.events });
    expect(ok.accepted).toBe(1);
    expect(matchRow().activeScorerId).toBe(owner);
  });

  it('lock and release', async () => {
    Object.assign(matchRow(), { activeScorerId: otherScorer, scorerLockedAt: new Date() });
    expect((await failure(scoring.lockScorer(matchId, owner))).code).toBe('SCORER_LOCKED');

    matchRow().activeScorerId = owner;
    await scoring.releaseScorer(matchId, stranger); // not the holder: no effect
    expect(matchRow().activeScorerId).toBe(owner);
    scorerChanges.length = 0;
    await scoring.releaseScorer(matchId, owner);
    expect(matchRow().activeScorerId).toBeNull();
    expect(scorerChanges).toEqual([null]);
  });
});

describe('a whole match', () => {
  it('first innings ends, chase, result, then undo re-opens', async () => {
    await toTossAndFirstInnings();

    // Innings 1: 6 balls, 8 runs.
    const first = new Scorer(firstSetup);
    [4, 1, 2, 0, 1, 0].forEach((runs) => first.ball({ runs, boundary: runs === 4 }));
    const r1 = await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: first.events });
    expect(r1.innings).toMatchObject({ runs: 8, status: 'completed', completedReason: 'oversDone' });
    expect(r1.matchStatus).toBe('innings_break');
    expect(db.table('innings').rows[0]!.completedAt).toBeInstanceOf(Date);

    // Innings 1 cannot be edited once innings 2 starts.
    await scoring.startInnings(matchId, owner, secondSetup);
    expect(db.table('innings').rows[1]).toMatchObject({ inningsNo: 2, target: 9 });
    const stale = new Scorer(firstSetup);
    stale.ball();
    expect((await failure(scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: stale.events }))).code).toBe('INNINGS_LOCKED');

    // Innings 2: 4 + 4 + 1 = 9 reaches the target.
    const second = new Scorer(secondSetup, 9);
    second.ball({ runs: 4, boundary: true });
    second.ball({ runs: 4, boundary: true });
    scores.length = 0;
    status.length = 0;
    let res = await scoring.ingestEvents(matchId, owner, { inningsNo: 2, events: second.events });
    expect(res.matchStatus).toBe('live');
    const finisher = second.ball({ runs: 1 });
    res = await scoring.ingestEvents(matchId, owner, { inningsNo: 2, events: [finisher] });
    expect(res).toMatchObject({ matchStatus: 'completed', resultText: 'Team B won by 2 wickets' });
    expect(matchRow()).toMatchObject({
      status: 'completed', resultType: 'won_by_wickets', winnerId: teamB, resultMargin: 2,
      activeScorerId: null,
    });
    expect(status.at(-1)).toEqual({ matchId, status: 'completed' });

    // Wrong ball: undo it. The match goes back to live and the result disappears.
    const undo: BallEvent = { id: randomUUID(), type: 'undo', targetEventId: finisher.id };
    res = await scoring.ingestEvents(matchId, owner, { inningsNo: 2, events: [undo] });
    expect(res.innings.status).toBe('inProgress');
    expect(res.matchStatus).toBe('live');
    expect(matchRow()).toMatchObject({ status: 'live', resultType: null, winnerId: null, resultText: null });
    expect(db.table('innings').rows[1]!.completedAt).toBeNull();
  });

  it('defending side wins by runs and the event log can be listed for replay', async () => {
    await toTossAndFirstInnings();
    const first = new Scorer(firstSetup);
    [6, 6, 6, 0, 0, 0].forEach((runs) => first.ball({ runs, boundary: runs === 6 }));
    await scoring.ingestEvents(matchId, owner, { inningsNo: 1, events: first.events });
    await scoring.startInnings(matchId, owner, secondSetup);

    const second = new Scorer(secondSetup, 19);
    for (let i = 0; i < 6; i++) second.ball({ runs: 1 });
    const res = await scoring.ingestEvents(matchId, owner, { inningsNo: 2, events: second.events });
    expect(res.resultText).toBe('Team A won by 12 runs');
    expect(matchRow()).toMatchObject({ resultType: 'won_by_runs', winnerId: teamA, resultMargin: 12 });

    const log = await scoring.listEvents(matchId, 1, 3);
    expect(log.lastSeq).toBe(6);
    expect(log.events.map((e) => e.seq)).toEqual([4, 5, 6]);
  });

  it('closing a match as a walkover records the winner and frees the scorer', async () => {
    await toTossAndFirstInnings();
    const err = await failure(matchesSvc.closeMatch(matchId, owner, { outcome: 'walkover' }));
    expect(err.code).toBe('WINNER_REQUIRED');
    await matchesSvc.closeMatch(matchId, owner, { outcome: 'walkover', winnerTeamId: teamB });
    expect(matchRow()).toMatchObject({ status: 'walkover', winnerId: teamB, activeScorerId: null });
    expect((await failure(matchesSvc.closeMatch(matchId, owner, { outcome: 'abandoned' }))).code).toBe('MATCH_FINISHED');
  });
});
