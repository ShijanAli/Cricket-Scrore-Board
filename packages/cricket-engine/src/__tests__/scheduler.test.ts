import { describe, expect, it } from 'vitest';
import { schedulerConfigSchema, type SchedulerConfigInput } from '@cricket/shared';
import { EngineError } from '../errors';
import { parseDate, formatDate, weekdayOf } from '../tournament/dates';
import { generateFixtures } from '../tournament/fixtures';
import { scheduleFixtures } from '../tournament/scheduler';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const cfg = (over: Partial<SchedulerConfigInput> = {}) =>
  schedulerConfigSchema.parse({
    startDate: '2026-12-01',
    endDate: '2026-12-12',
    slots: ['09:00', '14:00'],
    grounds: ['G1'],
    ...over,
  });

describe('dates', () => {
  it('round-trips and knows the weekday', () => {
    expect(formatDate(parseDate('2026-12-01'))).toBe('2026-12-01');
    expect(weekdayOf(parseDate('2026-12-04'))).toBe(5); // Friday
    expect(parseDate('2026-12-02') - parseDate('2026-12-01')).toBe(1);
  });

  it('rejects impossible dates', () => {
    expect(() => parseDate('2026-02-30')).toThrowError(EngineError);
    expect(() => parseDate('12/01/2026')).toThrowError(EngineError);
  });
});

describe('scheduleFixtures', () => {
  it('fits a 4 team league into 3 days, no clashes', () => {
    const fixtures = generateFixtures(ids(4), 'league');
    const { scheduled, unscheduled } = scheduleFixtures(fixtures, cfg());
    expect(unscheduled).toEqual([]);
    expect(scheduled).toHaveLength(6);

    const slotKeys = scheduled.map((m) => `${m.date}|${m.time}|${m.ground}`);
    expect(new Set(slotKeys).size).toBe(6);

    for (const team of ids(4)) {
      const dates = scheduled
        .filter((m) => [m.a, m.b].some((s) => s.kind === 'team' && s.teamId === team))
        .map((m) => m.date);
      expect(new Set(dates).size).toBe(dates.length); // never twice a day
    }
    expect(new Set(scheduled.map((m) => m.date)).size).toBe(3);
    expect(scheduled[0]).toMatchObject({ date: '2026-12-01', time: '09:00', ground: 'G1' });
  });

  it('skips off weekdays and off dates', () => {
    const fixtures = generateFixtures(ids(4), 'league');
    const { scheduled } = scheduleFixtures(
      fixtures,
      cfg({ offWeekdays: [5], offDates: ['2026-12-02'], slots: ['09:00'] }),
    );
    expect(scheduled.some((m) => m.date === '2026-12-04')).toBe(false);
    expect(scheduled.some((m) => m.date === '2026-12-02')).toBe(false);
  });

  it('reports what does not fit instead of dropping silently', () => {
    const fixtures = generateFixtures(ids(4), 'league');
    const { scheduled, unscheduled } = scheduleFixtures(
      fixtures,
      cfg({ startDate: '2026-12-01', endDate: '2026-12-01', slots: ['09:00'] }),
    );
    expect(scheduled).toHaveLength(1);
    expect(unscheduled).toHaveLength(5);
  });

  it('more grounds put more matches on the same day', () => {
    const fixtures = generateFixtures(ids(4), 'league');
    const { scheduled } = scheduleFixtures(fixtures, cfg({ grounds: ['G1', 'G2'], slots: ['09:00'] }));
    const day1 = scheduled.filter((m) => m.date === '2026-12-01');
    expect(day1).toHaveLength(2);
  });

  it('minDaysBetweenMatches 2 leaves a rest day between a team\'s matches', () => {
    const fixtures = generateFixtures(ids(4), 'league');
    const { scheduled, unscheduled } = scheduleFixtures(fixtures, cfg({ minDaysBetweenMatches: 2 }));
    expect(unscheduled).toEqual([]);
    for (const team of ids(4)) {
      const days = scheduled
        .filter((m) => [m.a, m.b].some((s) => s.kind === 'team' && s.teamId === team))
        .map((m) => parseDate(m.date))
        .sort((x, y) => x - y);
      for (let i = 1; i < days.length; i++) expect(days[i]! - days[i - 1]!).toBeGreaterThanOrEqual(2);
    }
  });

  it('minDaysBetweenMatches 0 allows a team to play twice in a day in different slots', () => {
    const fixtures = generateFixtures(ids(2), 'league', { doubleRoundRobin: true });
    const { scheduled, unscheduled } = scheduleFixtures(
      fixtures,
      cfg({ minDaysBetweenMatches: 0, startDate: '2026-12-01', endDate: '2026-12-01' }),
    );
    expect(unscheduled).toEqual([]);
    expect(scheduled.map((m) => m.time)).toEqual(['09:00', '14:00']);
  });

  it('playoffs are scheduled after every match they depend on', () => {
    const fixtures = generateFixtures(ids(4), 'league_semi_final');
    const { scheduled, unscheduled } = scheduleFixtures(fixtures, cfg({ endDate: '2026-12-20' }));
    expect(unscheduled).toEqual([]);
    const dayOf = (no: number) => scheduled.find((m) => m.matchNo === no)!.date;
    const lastLeague = Math.max(...[1, 2, 3, 4, 5, 6].map((n) => dayOf(n)).map(parseDate));
    expect(parseDate(dayOf(7))).toBeGreaterThan(lastLeague);
    expect(parseDate(dayOf(8))).toBeGreaterThan(lastLeague);
    expect(parseDate(dayOf(9))).toBeGreaterThan(Math.max(parseDate(dayOf(7)), parseDate(dayOf(8))));
  });

  it('a fixture is unscheduled when something it depends on did not fit', () => {
    const fixtures = generateFixtures(ids(4), 'league_final');
    const { scheduled, unscheduled } = scheduleFixtures(
      fixtures,
      cfg({ startDate: '2026-12-01', endDate: '2026-12-02', slots: ['09:00'] }),
    );
    expect(scheduled.length).toBeLessThan(7);
    expect(unscheduled.some((m) => m.stage === 'final')).toBe(true);
  });

  it('knockout rounds follow each other', () => {
    const fixtures = generateFixtures(ids(8), 'knockout');
    const { scheduled, unscheduled } = scheduleFixtures(fixtures, cfg({ grounds: ['G1', 'G2'] }));
    expect(unscheduled).toEqual([]);
    const dayOf = (no: number) => parseDate(scheduled.find((m) => m.matchNo === no)!.date);
    expect(dayOf(5)).toBeGreaterThan(Math.max(dayOf(1), dayOf(2)));
    expect(dayOf(7)).toBeGreaterThan(Math.max(dayOf(5), dayOf(6)));
  });

  it('is deterministic', () => {
    const fixtures = generateFixtures(ids(6), 'league');
    expect(scheduleFixtures(fixtures, cfg())).toEqual(scheduleFixtures(fixtures, cfg()));
  });
});
