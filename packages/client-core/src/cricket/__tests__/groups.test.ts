import { describe, expect, it } from 'vitest';
import type { MatchSummary } from '../../api/types';
import { buildTournamentInput, defaultDraft } from '../../forms/tournament-form';
import { groupStandings, sideLabel, stageLabel } from '../fixture-utils';

describe('group stage helpers', () => {
  it('labels', () => {
    expect(stageLabel('group_C')).toBe('Group C');
    const m = { teamAId: null, teamBId: null, sourceA: { kind: 'groupPosition', group: 'A', position: 1 }, sourceB: { kind: 'groupPosition', group: 'B', position: 2 } } as unknown as MatchSummary;
    expect(sideLabel(m, 'A')).toBe('Winner of Group A');
    expect(sideLabel(m, 'B')).toBe('Runner-up of Group B');
  });

  it('one table per group, sorted by letter; plain league stays one table', () => {
    const t = groupStandings<{ group?: string | null; n: number }>([{ group: 'B', n: 1 }, { group: 'A', n: 2 }, { group: 'B', n: 3 }]);
    expect(t.map((x) => [x.label, x.rows.length])).toEqual([['Group A', 1], ['Group B', 2]]);
    expect(groupStandings<{ group?: string | null; n: number }>([{ n: 1 }, { n: 2 }])).toMatchObject([{ group: null, label: 'Table' }]);
  });

  it('form: groups need a valid count, and the count is sent only for the group format', () => {
    const base = { ...defaultDraft, name: 'World Cup', format: 'groups_knockout' as const, teamCount: 16, groupCount: 4, startDate: '2026-12-01', endDate: '2026-12-30' };
    const ok = buildTournamentInput(base);
    expect(ok.ok && ok.data.groupCount).toBe(4);
    const bad = buildTournamentInput({ ...base, groupCount: 3 });
    expect(bad.ok).toBe(false);
    const league = buildTournamentInput({ ...base, format: 'league' });
    expect(league.ok && league.data.groupCount).toBeUndefined();
  });
});
