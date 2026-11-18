import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InningsState } from '@cricket/shared';
import { createFakePrisma, type FakePrisma } from './fake-prisma';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../db/prisma', () => ({
  get prisma() {
    return h.db;
  },
}));

const svc = await import('../modules/tournaments/awards.service');

let db: FakePrisma;
beforeEach(() => {
  db = createFakePrisma();
  h.db = db;
});

const snap = (o: Partial<InningsState>): InningsState =>
  ({
    battingTeamId: 'A', bowlingTeamId: 'B', strikerId: null, nonStrikerId: null, bowlerId: null, previousBowlerId: null,
    runs: 0, wickets: 0, legalBalls: 0, extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 }, batters: {}, battingOrder: [],
    bowlers: {}, thisOver: [], fallOfWickets: [], partnership: { runs: 0, balls: 0 }, freeHit: false,
    needsNewBatter: false, needsNewBowler: false, status: 'completed', completedReason: 'oversDone', target: null,
    maxWickets: 10, maxBalls: 120, ballsPerOver: 6, ...o,
  }) as InningsState;

function seed() {
  const teamA = { id: randomUUID(), name: 'Alpha' };
  const teamB = { id: randomUUID(), name: 'Beta' };
  const p1 = { id: randomUUID(), name: 'Rahim' };
  const p2 = { id: randomUUID(), name: 'Karim' };
  db.table('team').rows.push(teamA, teamB);
  db.table('player').rows.push(p1, p2);
  const series = { id: randomUUID(), teamAId: teamA.id, teamBId: teamB.id, matchCount: 3, status: 'completed' };
  db.table('series').rows.push(series);
  for (let n = 1; n <= 2; n++) {
    const m = { id: randomUUID(), seriesId: series.id, status: 'completed', winnerId: teamA.id, teamAId: teamA.id, teamBId: teamB.id };
    db.table('match').rows.push(m);
    db.table('innings').rows.push({
      id: randomUUID(), matchId: m.id, inningsNo: 1,
      snapshot: snap({
        battingTeamId: teamA.id, bowlingTeamId: teamB.id,
        batters: { [p1.id]: { id: p1.id, runs: 60, balls: 30, fours: 6, sixes: 3, status: 'out' } },
        bowlers: { [p2.id]: { id: p2.id, legalBalls: 24, runs: 30, wickets: 0, wides: 0, noBalls: 0, maidens: 0, currentOverRuns: 0 } },
      }),
    });
  }
  return { series, teamA, p1 };
}

describe('series awards', () => {
  it('champion, Man of the Series and top scorer from completed matches', async () => {
    const { series, teamA, p1 } = seed();
    const a = await svc.getSeriesAwards(series.id);
    expect(a.matchesCounted).toBe(2);
    expect(a.champion).toMatchObject({ id: teamA.id, name: 'Alpha' });
    expect(a.runnerUp?.name).toBe('Beta');
    expect(a.bestPlayerTitle).toBe('Man of the Series');
    expect(a.bestPlayer).toMatchObject({ playerId: p1.id, name: 'Rahim', teamName: 'Alpha', runs: 120, matches: 2 });
    expect(a.bestPlayer?.reason).toContain('Rahim (Alpha) is Man of the Series: 120 runs');
    expect(a.bestPlayer?.reason).toContain('over 2 matches');
    expect(a.champion?.reason).toBe('Won the series 2-0.');
    expect(a.mostSixes?.name).toBe('Rahim');
    expect(a.formula).toContain('1 per run');
    expect(a.topRunScorer?.name).toBe('Rahim');
    expect(a.topWicketTaker).toBeNull();
  });

  it('unfinished series has no champion; unknown id is 404', async () => {
    const { series } = seed();
    series.status = 'live';
    series.matchCount = 5;
    expect((await svc.getSeriesAwards(series.id)).champion).toBeNull();
    await expect(svc.getSeriesAwards(randomUUID())).rejects.toMatchObject({ status: 404 });
  });
});
