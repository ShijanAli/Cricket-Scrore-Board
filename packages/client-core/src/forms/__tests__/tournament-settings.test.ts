import { describe, expect, it } from 'vitest';
import type { TournamentDetail } from '../../api/types';
import { activeNotices, buildTournamentUpdate, editScope, pauseNotice, settingsDraftFrom } from '../tournament-settings';

const t = (over: Partial<TournamentDetail> = {}): TournamentDetail =>
  ({
    id: 't1',
    ownerId: 'u',
    name: 'Block C League',
    format: 'league',
    teamCount: 4,
    doubleRoundRobin: false,
    scheduleMode: 'auto',
    status: 'draft',
    rules: { oversPerInnings: 10, ballsPerOver: 6, maxOversPerBowler: 2, playersPerSide: 11, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastManStands: false },
    points: { win: 2, tie: 1, noResult: 1, loss: 0 },
    tiebreakers: ['points', 'wins', 'nrr'],
    teams: [],
    members: [],
    ...over,
  }) as TournamentDetail;

describe('editScope', () => {
  it('draft edits everything, live locks structure, completed locks all', () => {
    expect(editScope('draft')).toEqual({ basics: true, rules: true, structure: true });
    expect(editScope('live')).toEqual({ basics: true, rules: true, structure: false });
    expect(editScope('paused').structure).toBe(false);
    expect(editScope('completed')).toEqual({ basics: false, rules: false, structure: false });
  });
});

describe('buildTournamentUpdate', () => {
  it('returns null when nothing changed', () => {
    expect(buildTournamentUpdate(settingsDraftFrom(t()), t())).toEqual({ ok: true, changes: null });
  });

  it('sends only what changed and re-derives the bowler cap when overs change', () => {
    const d = { ...settingsDraftFrom(t()), overs: 20, win: 3 };
    const r = buildTournamentUpdate(d, t());
    expect(r.ok && r.changes).toMatchObject({ points: { win: 3, tie: 1, noResult: 1, loss: 0 }, rules: { oversPerInnings: 20, maxOversPerBowler: 4, playersPerSide: 11 } });
    expect(r.ok && r.changes && 'name' in r.changes).toBe(false);
  });

  it('keeps a custom bowler cap when only players change', () => {
    const r = buildTournamentUpdate({ ...settingsDraftFrom(t()), playersPerSide: 8 }, t());
    expect(r.ok && r.changes?.rules?.maxOversPerBowler).toBe(2);
  });

  it('ignores structure edits once the tournament is live', () => {
    const live = t({ status: 'live' });
    const r = buildTournamentUpdate({ ...settingsDraftFrom(live), teamCount: 8 }, live);
    expect(r).toEqual({ ok: true, changes: null });
  });

  it('reports invalid values per field', () => {
    const r = buildTournamentUpdate({ ...settingsDraftFrom(t()), overs: 0 }, t());
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.overs).toBeTruthy();
    const bad = buildTournamentUpdate({ ...settingsDraftFrom(t()), name: 'ab' }, t());
    expect(!bad.ok && bad.errors.name).toBeTruthy();
  });
});

describe('notices', () => {
  const n = (kind: string, active: boolean) => ({ id: kind + active, tournamentId: 't', kind, title: 'x', message: '', createdAt: '', resolvedAt: null, active }) as never;
  it('finds the active pause banner', () => {
    const all = [n('resumed', false), n('delay', true), n('paused', true)];
    expect(activeNotices(all)).toHaveLength(2);
    expect(pauseNotice(all)?.kind).toBe('paused');
    expect(pauseNotice([n('paused', false)])).toBeNull();
  });
});
