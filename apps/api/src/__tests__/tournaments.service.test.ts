import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTournamentSchema, type CreateTournamentFormValues } from '@cricket/shared';
import { AppError } from '../lib/errors';
import { createFakePrisma, type FakePrisma } from './fake-prisma';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../db/prisma', () => ({
  get prisma() {
    return h.db;
  },
}));

const svc = await import('../modules/tournaments/tournaments.service');
const seriesSvc = await import('../modules/tournaments/series.service');

const owner = randomUUID();
let db: FakePrisma;

beforeEach(() => {
  db = createFakePrisma();
  h.db = db;
});

const base: CreateTournamentFormValues = {
  name: 'Block C League',
  format: 'league',
  teamCount: 4,
  rules: { oversPerInnings: 6 },
  scheduler: { startDate: '2026-12-01', endDate: '2026-12-20', slots: ['09:00', '14:00'] },
};

const makeTournament = (over: Partial<CreateTournamentFormValues> = {}) =>
  svc.createTournament(owner, createTournamentSchema.parse({ ...base, ...over }));

function addTeams(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = { id: randomUUID(), name: `Team ${i + 1}`, ownerId: owner };
    db.table('team').rows.push(t);
    return t;
  });
}

const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error('expected a rejection');
};

describe('tournament setup', () => {
  it('creator becomes organiser; only organisers manage', async () => {
    const t = await makeTournament();
    expect(db.table('tournamentMember').rows[0]).toMatchObject({ tournamentId: t.id, userId: owner, role: 'organiser' });
    const [team] = addTeams(1);
    expect((await failure(svc.addTeam(t.id, randomUUID(), team!.id))).status).toBe(403);
  });

  it('adds teams up to teamCount; each team once; you can only add your own teams', async () => {
    const t = await makeTournament({ teamCount: 2 });
    const [a, b, c] = addTeams(3);
    await svc.addTeam(t.id, owner, a!.id);
    expect((await failure(svc.addTeam(t.id, owner, a!.id))).code).toBe('DUPLICATE_ENTRY');
    await svc.addTeam(t.id, owner, b!.id);
    expect((await failure(svc.addTeam(t.id, owner, c!.id))).code).toBe('TOURNAMENT_FULL');

    const foreign = { id: randomUUID(), name: 'Foreign', ownerId: randomUUID() };
    db.table('team').rows.push(foreign);
    const t2 = await makeTournament();
    expect((await failure(svc.addTeam(t2.id, owner, foreign.id))).status).toBe(403);
  });

  it('a player can play for one team per tournament', async () => {
    const t = await makeTournament({ teamCount: 3 });
    const [a, b, c] = addTeams(3);
    const player = { id: randomUUID(), name: 'Karim' };
    db.table('player').rows.push(player);
    db.table('teamPlayer').rows.push(
      { teamId: a!.id, playerId: player.id },
      { teamId: b!.id, playerId: player.id },
    );
    await svc.addTeam(t.id, owner, a!.id);
    const err = await failure(svc.addTeam(t.id, owner, b!.id));
    expect(err).toMatchObject({ status: 409, code: 'PLAYER_IN_OTHER_TEAM' });
    expect(err.message).toBe('Karim already plays for Team 1 in this tournament');
    await svc.addTeam(t.id, owner, c!.id); // a team with no shared players is fine
  });
});

describe('fixtures', () => {
  it('needs all teams first', async () => {
    const t = await makeTournament();
    for (const tm of addTeams(2)) await svc.addTeam(t.id, owner, tm.id);
    expect((await failure(svc.generateTournamentFixtures(t.id, owner))).code).toBe('TEAMS_INCOMPLETE');
  });

  it('auto schedule: creates every league match with date, time, ground and the tournament rules', async () => {
    const t = await makeTournament();
    for (const tm of addTeams(4)) await svc.addTeam(t.id, owner, tm.id);
    const fixtures = await svc.generateTournamentFixtures(t.id, owner);

    expect(fixtures).toHaveLength(6); // 4 teams, single round robin
    expect(db.table('tournament').rows[0]!.status).toBe('live');
    for (const m of fixtures) {
      expect(m).toMatchObject({ type: 'tournament', stage: 'league', status: 'scheduled' });
      expect(m.scheduledDate).toMatch(/^2026-12-\d\d$/);
      expect(m.scheduledTime).toMatch(/^(09|14):00$/);
      expect(m.teamAId && m.teamBId).toBeTruthy();
      expect(m.rules).toMatchObject({ oversPerInnings: 6 });
    }
    // Generating twice is refused.
    expect((await failure(svc.generateTournamentFixtures(t.id, owner))).code).toBe('FIXTURES_EXIST');
    // ...and so is changing the teams afterwards.
    expect((await failure(svc.removeTeam(t.id, owner, fixtures[0]!.teamAId!))).code).toBe('FIXTURES_EXIST');
  });

  it('refuses a date range that is too short and creates nothing', async () => {
    const t = await makeTournament({
      scheduler: { startDate: '2026-12-01', endDate: '2026-12-01', slots: ['09:00'] },
    });
    for (const tm of addTeams(4)) await svc.addTeam(t.id, owner, tm.id);
    const err = await failure(svc.generateTournamentFixtures(t.id, owner));
    expect(err).toMatchObject({ status: 422, code: 'SCHEDULE_DOES_NOT_FIT' });
    expect(db.table('match').rows).toHaveLength(0);
    expect(db.table('tournament').rows[0]!.status).toBe('draft');
  });

  it('manual mode leaves dates empty; knockout playoffs start with TBD slots', async () => {
    const t = await makeTournament({ format: 'league_final', scheduleMode: 'manual', scheduler: undefined });
    for (const tm of addTeams(4)) await svc.addTeam(t.id, owner, tm.id);
    const fixtures = await svc.generateTournamentFixtures(t.id, owner);
    expect(fixtures).toHaveLength(7);
    expect(fixtures.every((m) => m.scheduledDate === null && m.scheduledTime === null)).toBe(true);
    const final = fixtures.at(-1)!;
    expect(final).toMatchObject({ stage: 'final', teamAId: null, teamBId: null });
  });
});

describe('standings and playoff progression', () => {
  /** Finish a league match: `winner` wins 20-10. */
  const finish = (matchRow: Record<string, any>, winnerId: string) => {
    const loser = matchRow.teamAId === winnerId ? matchRow.teamBId : matchRow.teamAId;
    const snap = (team: string, runs: number, patch = {}) => ({
      battingTeamId: team, runs, legalBalls: 36, ballsPerOver: 6, maxBalls: 36, status: 'completed', completedReason: 'oversDone', ...patch,
    });
    Object.assign(matchRow, { status: 'completed', resultType: 'won_by_runs', winnerId });
    db.table('innings').rows.push(
      { id: randomUUID(), matchId: matchRow.id, inningsNo: 1, snapshot: snap(winnerId, 20) },
      { id: randomUUID(), matchId: matchRow.id, inningsNo: 2, snapshot: snap(loser, 10) },
    );
  };

  it('standings are computed from finished league matches only', async () => {
    const t = await makeTournament({ format: 'league_final', scheduleMode: 'manual', scheduler: undefined });
    const teams = addTeams(4);
    for (const tm of teams) await svc.addTeam(t.id, owner, tm.id);
    await svc.generateTournamentFixtures(t.id, owner);

    const league = db.table('match').rows.filter((m) => m.stage === 'league');
    // Team 1 wins all of its matches, others split.
    for (const m of league) finish(m, m.teamAId === teams[0]!.id || m.teamBId === teams[0]!.id ? teams[0]!.id : m.teamAId);

    const table = await svc.getStandings(t.id);
    expect(table[0]).toMatchObject({ teamId: teams[0]!.id, rank: 1, played: 3, won: 3, points: 6 });
    expect(table).toHaveLength(4);
  });

  it('after the league, the final gets 1st vs 2nd; then the tournament completes', async () => {
    const t = await makeTournament({ format: 'league_final', scheduleMode: 'manual', scheduler: undefined });
    const teams = addTeams(4);
    for (const tm of teams) await svc.addTeam(t.id, owner, tm.id);
    await svc.generateTournamentFixtures(t.id, owner);

    const rows = db.table('match').rows;
    const league = rows.filter((m) => m.stage === 'league');
    // Lower-numbered team always wins: 1 > 2 > 3 > 4
    const rank = (id: string) => teams.findIndex((x) => x.id === id);
    for (const m of league.slice(0, -1)) finish(m, rank(m.teamAId) < rank(m.teamBId) ? m.teamAId : m.teamBId);

    await svc.advanceTournament(t.id);
    const final = rows.find((m) => m.stage === 'final')!;
    expect(final.teamAId).toBeNull(); // league not finished yet: slots stay TBD

    const last = league.at(-1)!;
    finish(last, rank(last.teamAId) < rank(last.teamBId) ? last.teamAId : last.teamBId);
    await svc.advanceTournament(t.id);
    expect(final).toMatchObject({ teamAId: teams[0]!.id, teamBId: teams[1]!.id });
    expect(db.table('tournament').rows[0]!.status).toBe('live');

    finish(final, teams[0]!.id);
    await svc.advanceTournament(t.id);
    expect(db.table('tournament').rows[0]!.status).toBe('completed');
  });

  it('knockout winners move into the next round', async () => {
    const t = await makeTournament({ format: 'knockout', teamCount: 4, scheduleMode: 'manual', scheduler: undefined });
    const teams = addTeams(4);
    for (const [i, tm] of teams.entries()) await svc.addTeam(t.id, owner, tm.id, i + 1);
    await svc.generateTournamentFixtures(t.id, owner);

    const rows = db.table('match').rows;
    const semis = rows.filter((m) => m.stage === 'semi_final');
    expect(semis).toHaveLength(2);
    finish(semis[0]!, semis[0]!.teamAId);
    finish(semis[1]!, semis[1]!.teamBId);
    await svc.advanceTournament(t.id);
    const final = rows.find((m) => m.stage === 'final')!;
    expect([final.teamAId, final.teamBId].sort()).toEqual([semis[0]!.teamAId, semis[1]!.teamBId].sort());
  });
});

describe('series', () => {
  it('creates the matches and tracks the running score', async () => {
    const [a, b] = addTeams(2);
    const s = await seriesSvc.createSeries(owner, {
      name: 'Rivals Cup', teamAId: a!.id, teamBId: b!.id, matchCount: 3,
      rules: { oversPerInnings: 5, ballsPerOver: 6, maxOversPerBowler: null, playersPerSide: 11, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastManStands: false },
    });
    const matches = db.table('match').rows;
    expect(matches.map((m) => m.matchNo)).toEqual([1, 2, 3]);

    matches[0]!.winnerId = a!.id;
    matches[0]!.status = 'completed';
    expect((await seriesSvc.getSeries(s.id)).score).toEqual({ winsA: 1, winsB: 0, needed: 2, winnerTeamId: null });
    matches[1]!.winnerId = a!.id;
    matches[1]!.status = 'completed';
    expect((await seriesSvc.getSeries(s.id)).score.winnerTeamId).toBe(a!.id);

    await seriesSvc.advanceSeries(s.id);
    expect(db.table('series').rows[0]!.status).toBe('completed'); // decided 2-0, third match not needed
  });

  it('only your own teams', async () => {
    const [a] = addTeams(1);
    const other = { id: randomUUID(), name: 'Other', ownerId: randomUUID() };
    db.table('team').rows.push(other);
    const err = await failure(
      seriesSvc.createSeries(owner, { name: 'Bad', teamAId: a!.id, teamBId: other.id, matchCount: 3, rules: { oversPerInnings: 5 } as never }),
    );
    expect(err.status).toBe(403);
  });
});

describe('group stage + knockout', () => {
  const groupTournament = (teamCount: number, groupCount: number, over: Partial<CreateTournamentFormValues> = {}) =>
    makeTournament({ format: 'groups_knockout', teamCount, groupCount, ...over });

  const finish = (m: { id: string }, winnerId: string) => {
    const row = db.table('match').rows.find((r) => r.id === m.id)!;
    row.status = 'walkover';
    row.winnerId = winnerId;
  };

  it('schema needs a valid group count and enough teams', () => {
    expect(() => createTournamentSchema.parse({ ...base, format: 'groups_knockout', teamCount: 16 })).toThrow();
    expect(() => createTournamentSchema.parse({ ...base, format: 'groups_knockout', teamCount: 16, groupCount: 3 })).toThrow();
    expect(() => createTournamentSchema.parse({ ...base, format: 'groups_knockout', teamCount: 6, groupCount: 4 })).toThrow();
    expect(createTournamentSchema.parse({ ...base, format: 'groups_knockout', teamCount: 16, groupCount: 4 }).groupCount).toBe(4);
  });

  it('16 teams / 4 groups: auto draw, 31 matches, groups saved on the teams', async () => {
    const t = await groupTournament(16, 4, {
      scheduler: { startDate: '2026-12-01', endDate: '2026-12-31', slots: ['09:00', '14:00'], grounds: ['G1', 'G2'] },
    });
    for (const tm of addTeams(16)) await svc.addTeam(t.id, owner, tm.id);
    const fixtures = await svc.generateTournamentFixtures(t.id, owner);
    expect(fixtures).toHaveLength(31);
    expect(fixtures.filter((m) => m.stage === 'group_A')).toHaveLength(6);
    expect(fixtures.filter((m) => m.stage === 'quarter_final')).toHaveLength(4);
    const groupOf = (id: string) => db.table('tournamentTeam').rows.find((r) => r.teamId === id)!.groupName;
    expect(['A', 'B', 'C', 'D'].map((g) => db.table('tournamentTeam').rows.filter((r) => r.groupName === g).length)).toEqual([4, 4, 4, 4]);
    for (const m of fixtures.filter((x) => x.stage === 'group_B')) expect(groupOf(m.teamAId!)).toBe('B');
    // the final is the last match played
    const last = [...fixtures].sort((a, b) => `${a.scheduledDate}${a.scheduledTime}`.localeCompare(`${b.scheduledDate}${b.scheduledTime}`)).at(-1)!;
    expect(last.stage).toBe('final');
  });

  it('manual draw is used; a half-done draw is refused', async () => {
    const t = await groupTournament(8, 2, { scheduleMode: 'manual', scheduler: undefined });
    const teams = addTeams(8);
    for (const tm of teams) await svc.addTeam(t.id, owner, tm.id);
    await svc.setGroups(t.id, owner, [{ teamId: teams[0]!.id, group: 'B' }]);
    expect((await failure(svc.generateTournamentFixtures(t.id, owner))).code).toBe('GROUPS_INCOMPLETE');
    expect((await failure(svc.setGroups(t.id, owner, [{ teamId: teams[0]!.id, group: 'C' }]))).code).toBe('BAD_GROUP');
    await svc.setGroups(t.id, owner, teams.map((tm, i) => ({ teamId: tm.id, group: i < 5 ? 'A' : 'B' })));
    const fixtures = await svc.generateTournamentFixtures(t.id, owner);
    expect(fixtures.filter((m) => m.stage === 'group_A')).toHaveLength(10); // 5 teams
    expect(fixtures.filter((m) => m.stage === 'group_B')).toHaveLength(3);
    expect(fixtures.filter((m) => m.stage === 'semi_final')).toHaveLength(2);
  });

  it('top two of each group fill the knockout slots, winners advance, tournament completes', async () => {
    const t = await groupTournament(8, 2, { scheduleMode: 'manual', scheduler: undefined });
    const teams = addTeams(8);
    for (const tm of teams) await svc.addTeam(t.id, owner, tm.id);
    let fixtures = await svc.generateTournamentFixtures(t.id, owner);
    const byId = new Map(db.table('tournamentTeam').rows.map((r) => [r.teamId, r.groupName as string]));

    // Within each group the team that joined first beats everyone: it wins the group, the next is 2nd.
    const rank = (id: string) => teams.findIndex((x) => x.id === id);
    for (const m of fixtures.filter((x) => x.stage.startsWith('group_'))) {
      finish(m, rank(m.teamAId!) < rank(m.teamBId!) ? m.teamAId! : m.teamBId!);
    }
    await svc.advanceTournament(t.id);
    fixtures = await svc.listFixtures(t.id);
    const semis = fixtures.filter((x) => x.stage === 'semi_final');
    const inGroup = (g: string) => teams.filter((x) => byId.get(x.id) === g).sort((a, b) => rank(a.id) - rank(b.id));
    const [a1, a2] = inGroup('A');
    const [b1, b2] = inGroup('B');
    // 1A v 2B and 1B v 2A
    expect([semis[0]!.teamAId, semis[0]!.teamBId]).toEqual([a1!.id, b2!.id]);
    expect([semis[1]!.teamAId, semis[1]!.teamBId]).toEqual([b1!.id, a2!.id]);

    for (const s of semis) finish(s, s.teamAId!);
    await svc.advanceTournament(t.id);
    fixtures = await svc.listFixtures(t.id);
    const final = fixtures.at(-1)!;
    expect(final.stage).toBe('final');
    expect([final.teamAId, final.teamBId]).toEqual([a1!.id, b1!.id]);
    finish(final, a1!.id);
    await svc.advanceTournament(t.id);
    expect(db.table('tournament').rows[0]!.status).toBe('completed');
  });

  it('standings are one table per group', async () => {
    const t = await groupTournament(8, 2, { scheduleMode: 'manual', scheduler: undefined });
    for (const tm of addTeams(8)) await svc.addTeam(t.id, owner, tm.id);
    await svc.generateTournamentFixtures(t.id, owner);
    const rows = await svc.getStandings(t.id);
    expect(rows).toHaveLength(8);
    expect(rows.filter((r) => r.group === 'A')).toHaveLength(4);
    expect(rows.filter((r) => r.group === 'A').map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
});
