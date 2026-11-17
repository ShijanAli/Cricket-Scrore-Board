import { describe, expect, it } from 'vitest';
import {
  addSquadPlayerSchema,
  ballEventSchema,
  createSeriesSchema,
  createTeamSchema,
  createTournamentSchema,
  deliveryEventSchema,
  inningsSetupSchema,
  matchRulesSchema,
  schedulerConfigSchema,
} from '../index';

const rules = { oversPerInnings: 10 };

describe('matchRulesSchema', () => {
  it('fills defaults', () => {
    expect(matchRulesSchema.parse(rules)).toEqual({
      oversPerInnings: 10,
      ballsPerOver: 6,
      maxOversPerBowler: null,
      playersPerSide: 11,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitOnNoBall: true,
      allowByes: true,
      allowLegByes: true,
      lastManStands: false,
    });
  });

  it('bowler quota cannot exceed the innings length', () => {
    expect(matchRulesSchema.safeParse({ ...rules, maxOversPerBowler: 11 }).success).toBe(false);
    expect(matchRulesSchema.safeParse({ ...rules, maxOversPerBowler: 2 }).success).toBe(true);
  });
});

describe('ball events', () => {
  const base = { id: 'e1', type: 'delivery', strikerId: 'a', bowlerId: 'b', runs: 1 };

  it('defaults extra to none', () => {
    const e = deliveryEventSchema.parse(base);
    expect(e.extra).toBe('none');
    expect(e.boundary).toBe(false);
  });

  it('boundary needs 4 or more runs', () => {
    expect(deliveryEventSchema.safeParse({ ...base, boundary: true }).success).toBe(false);
    expect(deliveryEventSchema.safeParse({ ...base, runs: 4, boundary: true }).success).toBe(true);
  });

  it('bye and leg bye need at least one run', () => {
    expect(deliveryEventSchema.safeParse({ ...base, runs: 0, extra: 'bye' }).success).toBe(false);
    expect(deliveryEventSchema.safeParse({ ...base, runs: 1, extra: 'legBye' }).success).toBe(true);
  });

  it('the union accepts every event kind and rejects unknown ones', () => {
    expect(ballEventSchema.safeParse({ id: 'x', type: 'strikeSwap' }).success).toBe(true);
    expect(ballEventSchema.safeParse({ id: 'x', type: 'batterIn', batterId: 'a3' }).success).toBe(true);
    expect(ballEventSchema.safeParse({ id: 'x', type: 'undo', targetEventId: 'e1' }).success).toBe(true);
    expect(ballEventSchema.safeParse({ id: 'x', type: 'explode' }).success).toBe(false);
  });

  it('innings setup needs distinct players and teams', () => {
    const ok = { battingTeamId: 'A', bowlingTeamId: 'B', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' };
    expect(inningsSetupSchema.safeParse(ok).success).toBe(true);
    expect(inningsSetupSchema.safeParse({ ...ok, nonStrikerId: 'a1' }).success).toBe(false);
    expect(inningsSetupSchema.safeParse({ ...ok, bowlingTeamId: 'A' }).success).toBe(false);
  });
});

describe('teams and players', () => {
  it('uppercases the short name and defaults the colour', () => {
    const t = createTeamSchema.parse({ name: ' Mirpur Kings ', shortName: 'mk' });
    expect(t).toMatchObject({ name: 'Mirpur Kings', shortName: 'MK', color: '#0E7C4A' });
  });

  it('validates Bangladeshi mobile numbers', () => {
    expect(createTeamSchema.safeParse({ name: 'AB', shortName: 'AB', contactNumber: '01712345678' }).success).toBe(true);
    expect(createTeamSchema.safeParse({ name: 'AB', shortName: 'AB', contactNumber: '12345' }).success).toBe(false);
  });

  it('squad entry is either an existing player or a new one, not both', () => {
    expect(addSquadPlayerSchema.safeParse({ playerId: 'p1' }).success).toBe(true);
    expect(addSquadPlayerSchema.safeParse({ newPlayer: { name: 'Rahim' } }).success).toBe(true);
    expect(addSquadPlayerSchema.safeParse({}).success).toBe(false);
    expect(addSquadPlayerSchema.safeParse({ playerId: 'p1', newPlayer: { name: 'Rahim' } }).success).toBe(false);
  });
});

describe('tournaments and series', () => {
  const scheduler = { startDate: '2026-12-01', endDate: '2026-12-12', slots: ['09:00'] };

  it('auto schedule needs scheduler config', () => {
    const base = { name: 'Block C League', format: 'league', teamCount: 8, rules };
    expect(createTournamentSchema.safeParse(base).success).toBe(false);
    expect(createTournamentSchema.safeParse({ ...base, scheduler }).success).toBe(true);
    expect(createTournamentSchema.safeParse({ ...base, scheduleMode: 'manual' }).success).toBe(true);
  });

  it('semi-finals need four teams', () => {
    const t = { name: 'Cup', format: 'league_semi_final', teamCount: 3, rules, scheduleMode: 'manual' };
    expect(createTournamentSchema.safeParse(t).success).toBe(false);
    expect(createTournamentSchema.safeParse({ ...t, teamCount: 4 }).success).toBe(true);
  });

  it('scheduler end date cannot be before the start', () => {
    expect(schedulerConfigSchema.safeParse({ ...scheduler, endDate: '2026-11-30' }).success).toBe(false);
    expect(schedulerConfigSchema.parse(scheduler).minDaysBetweenMatches).toBe(1);
  });

  it('series needs an odd match count and two different teams', () => {
    const s = { name: 'Rivals', teamAId: 'a', teamBId: 'b', matchCount: 3, rules };
    expect(createSeriesSchema.safeParse(s).success).toBe(true);
    expect(createSeriesSchema.safeParse({ ...s, matchCount: 4 }).success).toBe(false);
    expect(createSeriesSchema.safeParse({ ...s, teamBId: 'a' }).success).toBe(false);
  });
});
