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
const admin = await import('../modules/tournaments/admin.service');
const access = await import('../modules/matches/access');

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
  scheduler: { startDate: '2026-12-01', endDate: '2026-12-20', slots: ['09:00'] },
};
const make = (over: Partial<CreateTournamentFormValues> = {}) =>
  svc.createTournament(owner, createTournamentSchema.parse({ ...base, ...over }));
const setStatus = (id: string, status: string) => {
  db.table('tournament').rows.find((r: { id: string }) => r.id === id)!.status = status;
};
const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error('expected a rejection');
};
const addMatch = (tournamentId: string, status: string, overs = 6) => {
  const m = { id: randomUUID(), tournamentId, status, rules: { oversPerInnings: overs, ballsPerOver: 6, playersPerSide: 11 } };
  db.table('match').rows.push(m);
  return m;
};

describe('editing a tournament', () => {
  it('draft: changes name, overs, points and team count', async () => {
    const t = await make();
    const { tournament } = await admin.updateTournament(t.id, owner, {
      name: 'Renamed Cup',
      rules: { oversPerInnings: 10, ballsPerOver: 6, playersPerSide: 8 } as never,
      points: { win: 3, tie: 1, noResult: 1, loss: 0 },
      teamCount: 6,
    });
    expect(tournament).toMatchObject({ name: 'Renamed Cup', teamCount: 6 });
    expect((tournament.rules as { oversPerInnings: number }).oversPerInnings).toBe(10);
  });

  it('only organisers can edit', async () => {
    const t = await make();
    expect((await fail(admin.updateTournament(t.id, randomUUID(), { name: 'Hacked name' }))).status).toBe(403);
  });

  it('refuses a team count below the teams already added', async () => {
    const t = await make();
    for (let i = 0; i < 3; i++) db.table('tournamentTeam').rows.push({ tournamentId: t.id, teamId: randomUUID(), seed: null });
    expect((await fail(admin.updateTournament(t.id, owner, { teamCount: 2 }))).code).toBe('TEAM_COUNT_TOO_LOW');
  });

  it('live: new rules reach only matches that have not started', async () => {
    const t = await make();
    setStatus(t.id, 'live');
    const upcoming = addMatch(t.id, 'scheduled');
    const done = addMatch(t.id, 'completed');
    const inPlay = addMatch(t.id, 'live');
    const res = await admin.updateTournament(t.id, owner, {
      rules: { oversPerInnings: 8, ballsPerOver: 6, playersPerSide: 11 } as never,
    });
    expect(res.updatedMatches).toBe(1);
    const over = (id: string) => (db.table('match').rows.find((m: { id: string }) => m.id === id)!.rules as { oversPerInnings: number }).oversPerInnings;
    expect(over(upcoming.id)).toBe(8);
    expect(over(done.id)).toBe(6);
    expect(over(inPlay.id)).toBe(6);
  });

  it('live: refuses fewer players per side than an XI already picked', async () => {
    const t = await make();
    setStatus(t.id, 'live');
    const m = addMatch(t.id, 'scheduled');
    for (let i = 0; i < 9; i++) db.table('matchPlayer').rows.push({ matchId: m.id, teamId: 'A', playerId: randomUUID() });
    const e = await fail(admin.updateTournament(t.id, owner, { rules: { oversPerInnings: 6, ballsPerOver: 6, playersPerSide: 8 } as never }));
    expect(e.code).toBe('XI_TOO_LARGE');
  });

  it('live: structure is locked; completed: rename only', async () => {
    const t = await make();
    setStatus(t.id, 'live');
    expect((await fail(admin.updateTournament(t.id, owner, { teamCount: 8 }))).code).toBe('FIXTURES_EXIST');
    setStatus(t.id, 'completed');
    expect((await fail(admin.updateTournament(t.id, owner, { points: { win: 3, tie: 1, noResult: 1, loss: 0 } }))).code).toBe('TOURNAMENT_COMPLETED');
    await expect(admin.updateTournament(t.id, owner, { name: 'Final name' })).resolves.toBeTruthy();
  });

  it('changing group count clears a manual draw', async () => {
    const t = await make({ format: 'groups_knockout', groupCount: 2, teamCount: 8 });
    db.table('tournamentTeam').rows.push({ tournamentId: t.id, teamId: randomUUID(), seed: null, groupName: 'A' });
    await admin.updateTournament(t.id, owner, { groupCount: 4 });
    expect(db.table('tournamentTeam').rows[0].groupName).toBeNull();
    expect((await fail(admin.updateTournament(t.id, owner, { groupCount: 8 }))).code).toBe('TEAM_COUNT_INVALID');
  });
});

describe('pause, resume and notices', () => {
  it('pause needs a live tournament, adds an active public notice, and blocks scoring', async () => {
    const t = await make();
    expect((await fail(admin.pauseTournament(t.id, owner, { reason: 'Rain', message: '' }))).code).toBe('NOT_LIVE');
    setStatus(t.id, 'live');
    const { tournament, notice } = await admin.pauseTournament(t.id, owner, { reason: 'Heavy rain at the ground', message: 'Back at 3pm' });
    expect(tournament.status).toBe('paused');
    expect(notice).toMatchObject({ kind: 'paused', title: 'Heavy rain at the ground' });
    expect((await admin.listNotices(t.id))[0]).toMatchObject({ active: true });
    expect((await fail(access.assertTournamentNotPaused(t.id))).code).toBe('TOURNAMENT_PAUSED');
    expect((await fail(admin.pauseTournament(t.id, owner, { reason: 'Again', message: '' }))).code).toBe('NOT_LIVE');
  });

  it('resume goes live, clears the pause banner and logs it', async () => {
    const t = await make();
    setStatus(t.id, 'live');
    await admin.pauseTournament(t.id, owner, { reason: 'Dispute over a result', message: '' });
    const { tournament } = await admin.resumeTournament(t.id, owner, { message: 'Resolved' });
    expect(tournament.status).toBe('live');
    const notices = await admin.listNotices(t.id);
    expect(notices.filter((n: { active: boolean }) => n.active)).toHaveLength(0);
    expect(notices.map((n: { kind: string }) => n.kind).sort()).toEqual(['paused', 'resumed']);
    await expect(access.assertTournamentNotPaused(t.id)).resolves.toBeUndefined();
    expect((await fail(admin.resumeTournament(t.id, owner, { message: '' }))).code).toBe('NOT_PAUSED');
  });

  it('organiser can post and resolve ordinary notices, not fake pause ones', async () => {
    const t = await make();
    const n = await admin.createNotice(t.id, owner, { kind: 'delay', title: 'Matches start 1 hour late', message: '' });
    expect((await admin.listNotices(t.id))[0]).toMatchObject({ id: n.id, active: true });
    await admin.resolveNotice(t.id, owner, n.id);
    expect((await admin.listNotices(t.id))[0]).toMatchObject({ active: false });
    expect((await fail(admin.createNotice(t.id, owner, { kind: 'paused', title: 'Fake pause', message: '' }))).code).toBe('NOTICE_KIND_RESERVED');
    expect((await fail(admin.createNotice(t.id, randomUUID(), { kind: 'info', title: 'Not allowed', message: '' }))).status).toBe(403);
  });
});
