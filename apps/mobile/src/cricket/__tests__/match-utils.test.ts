import { describe, expect, it } from 'vitest';
import type { MatchDetail } from '@/api/types';
import { inningsSides, nextStep, playerNames } from '../match-utils';

const base = { teamAId: 'A', teamBId: 'B', tossWinnerId: null, tossDecision: null } as const;

describe('inningsSides', () => {
  it('needs a toss', () => expect(inningsSides(base, 1)).toBeNull());
  it('toss winner bats first', () => {
    const m = { ...base, tossWinnerId: 'B', tossDecision: 'bat' as const };
    expect(inningsSides(m, 1)).toEqual({ batting: 'B', bowling: 'A' });
    expect(inningsSides(m, 2)).toEqual({ batting: 'A', bowling: 'B' });
  });
  it('toss winner bowls first', () => {
    const m = { ...base, tossWinnerId: 'B', tossDecision: 'bowl' as const };
    expect(inningsSides(m, 1)).toEqual({ batting: 'A', bowling: 'B' });
  });
  it('rejects innings 3', () => expect(inningsSides({ ...base, tossWinnerId: 'A', tossDecision: 'bat' }, 3)).toBeNull());
});

const player = (teamId: string, id: string) => ({ matchId: 'm', playerId: id, teamId, battingPosition: 1, player: { id, name: id.toUpperCase() } });
const detail = (over: Partial<MatchDetail>): MatchDetail =>
  ({ status: 'scheduled', currentInningsNo: 0, innings: [], players: [], ...base, ...over }) as unknown as MatchDetail;

describe('nextStep', () => {
  it('walks the match through its stages', () => {
    const xi = [player('A', 'a1'), player('A', 'a2'), player('B', 'b1'), player('B', 'b2')] as never;
    expect(nextStep(detail({ teamBId: null }))).toBe('waiting');
    expect(nextStep(detail({}))).toBe('xi');
    expect(nextStep(detail({ players: xi }))).toBe('toss');
    const tossed = { players: xi, tossWinnerId: 'A', tossDecision: 'bat' as const };
    expect(nextStep(detail(tossed))).toBe('startInnings');
    const inn = (n: number, status: 'inProgress' | 'completed') => ({ inningsNo: n, status }) as never;
    expect(nextStep(detail({ ...tossed, status: 'live', currentInningsNo: 1, innings: [inn(1, 'inProgress')] }))).toBe('score');
    expect(nextStep(detail({ ...tossed, status: 'innings_break', currentInningsNo: 1, innings: [inn(1, 'completed')] }))).toBe('startInnings');
    expect(nextStep(detail({ ...tossed, status: 'completed' }))).toBe('done');
  });
});

describe('playerNames', () => {
  it('falls back safely', () => {
    const name = playerNames([player('A', 'a1')] as never);
    expect(name('a1')).toBe('A1');
    expect(name('zz')).toBe('Unknown');
    expect(name(null)).toBe('—');
  });
});
