import { describe, expect, it } from 'vitest';
import { buildTournamentInput, defaultDraft } from '../tournament-form';

const valid = { ...defaultDraft, name: 'Village Cup', startDate: '2026-12-01', endDate: '2026-12-10' };

describe('buildTournamentInput', () => {
  it('builds a valid auto-scheduled tournament', () => {
    const r = buildTournamentInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.scheduler?.slots).toEqual(['09:00', '14:00']);
      expect(r.data.rules.oversPerInnings).toBe(10);
      expect(r.data.points.win).toBe(2); // schema defaults are applied
    }
  });

  it('maps errors to the field that caused them', () => {
    const r = buildTournamentInput({ ...valid, name: 'ab', startDate: 'tomorrow', slots: '9am' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeDefined();
      expect(r.errors['scheduler.startDate']).toBeDefined();
      expect(r.errors['scheduler.slots']).toBeDefined();
    }
  });

  it('rejects an end date before the start date', () => {
    const r = buildTournamentInput({ ...valid, startDate: '2026-12-10', endDate: '2026-12-01' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors['scheduler.endDate']).toBeDefined();
  });

  it('manual mode needs no dates', () => {
    const r = buildTournamentInput({ ...defaultDraft, name: 'Friendly Cup', scheduleMode: 'manual' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.scheduler).toBeUndefined();
  });

  it('semi-finals need four teams', () => {
    const r = buildTournamentInput({ ...valid, format: 'league_semi_final', teamCount: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.teamCount).toBeDefined();
  });
});
