import { describe, expect, it } from 'vitest';
import type { MatchSummary } from '@/api/types';
import { groupByStage, sideLabel, stageLabel } from '../fixture-utils';

const m = (over: Partial<MatchSummary>): MatchSummary =>
  ({ teamAId: null, teamBId: null, teamA: null, teamB: null, ...over }) as MatchSummary;

describe('sideLabel', () => {
  it('shows the team name when known', () => {
    expect(sideLabel(m({ teamAId: 'a', teamA: { name: 'Lions' } as never }), 'A')).toBe('Lions');
  });
  it('explains TBD slots', () => {
    expect(sideLabel(m({ sourceA: { kind: 'standing', position: 1 } }), 'A')).toBe('1st in table');
    expect(sideLabel(m({ sourceB: { kind: 'standing', position: 12 } }), 'B')).toBe('12th in table');
    expect(sideLabel(m({ sourceB: { kind: 'winnerOf', matchNo: 7 } }), 'B')).toBe('Winner of match 7');
    expect(sideLabel(m({}), 'A')).toBe('TBD');
  });
});

describe('groupByStage', () => {
  it('groups in match order and labels stages', () => {
    const g = groupByStage([
      m({ matchNo: 3, stage: 'final' }),
      m({ matchNo: 1, stage: 'league' }),
      m({ matchNo: 2, stage: 'league' }),
    ]);
    expect(g.map((x) => [x.label, x.matches.length])).toEqual([['League', 2], ['Final', 1]]);
  });
  it('labels knockout rounds', () => {
    expect(stageLabel('round_of_16')).toBe('Round of 16');
    expect(stageLabel('semi_final')).toBe('Semi-finals');
  });
});
