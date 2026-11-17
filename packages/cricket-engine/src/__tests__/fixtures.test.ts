import { describe, expect, it } from 'vitest';
import { EngineError } from '../errors';
import {
  generateFixtures,
  knockoutFixtures,
  roundRobinRounds,
  seedOrder,
  type FixtureDraft,
} from '../tournament/fixtures';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const teamOf = (s: FixtureDraft['a']) => (s.kind === 'team' ? s.teamId : '');

const pairKey = (a: string, b: string) => [a, b].sort().join('-');

describe('roundRobinRounds', () => {
  it('4 teams: 3 rounds of 2, every pair once, nobody twice in a round', () => {
    const rounds = roundRobinRounds(ids(4));
    expect(rounds).toHaveLength(3);
    expect(rounds.every((r) => r.length === 2)).toBe(true);
    const pairs = rounds.flat().map(([a, b]) => pairKey(a, b));
    expect(new Set(pairs).size).toBe(6);
    for (const round of rounds) {
      const teams = round.flat();
      expect(new Set(teams).size).toBe(teams.length);
    }
  });

  it('5 teams: 10 matches, each team plays 4, one team rests each round', () => {
    const rounds = roundRobinRounds(ids(5));
    expect(rounds).toHaveLength(5);
    expect(rounds.every((r) => r.length === 2)).toBe(true);
    const flat = rounds.flat();
    expect(flat).toHaveLength(10);
    expect(new Set(flat.map(([a, b]) => pairKey(a, b))).size).toBe(10);
    for (const t of ids(5)) {
      expect(flat.filter(([a, b]) => a === t || b === t)).toHaveLength(4);
    }
  });

  it('2 teams: a single match', () => {
    expect(roundRobinRounds(ids(2))).toEqual([[['t1', 't2']]]);
  });

  it('rejects fewer than 2 teams and duplicates', () => {
    expect(() => roundRobinRounds(ids(1))).toThrowError(EngineError);
    expect(() => roundRobinRounds(['a', 'a'])).toThrowError(EngineError);
  });
});

describe('generateFixtures: league', () => {
  it('single round robin numbers matches 1..n with league stage', () => {
    const f = generateFixtures(ids(4), 'league');
    expect(f.map((m) => m.matchNo)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(f.every((m) => m.stage === 'league' && m.dependsOn.length === 0)).toBe(true);
    expect(f.map((m) => m.round)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('double round robin: each pair twice, once in each orientation', () => {
    const f = generateFixtures(ids(4), 'league', { doubleRoundRobin: true });
    expect(f).toHaveLength(12);
    const ordered = f.map((m) => `${teamOf(m.a)}>${teamOf(m.b)}`);
    expect(new Set(ordered).size).toBe(12);
    expect(Math.max(...f.map((m) => m.round))).toBe(6);
  });
});

describe('generateFixtures: playoffs', () => {
  it('league + final: standings 1 v 2 after every league match', () => {
    const f = generateFixtures(ids(4), 'league_final');
    expect(f).toHaveLength(7);
    const final = f[6]!;
    expect(final).toMatchObject({
      matchNo: 7,
      stage: 'final',
      a: { kind: 'standing', position: 1 },
      b: { kind: 'standing', position: 2 },
    });
    expect(final.dependsOn).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('league + semis + final: 1v4, 2v3, then winners', () => {
    const f = generateFixtures(ids(4), 'league_semi_final');
    expect(f).toHaveLength(9);
    expect(f[6]).toMatchObject({ stage: 'semi_final', a: { kind: 'standing', position: 1 }, b: { kind: 'standing', position: 4 } });
    expect(f[7]).toMatchObject({ stage: 'semi_final', a: { kind: 'standing', position: 2 }, b: { kind: 'standing', position: 3 } });
    expect(f[8]).toMatchObject({
      stage: 'final',
      a: { kind: 'winnerOf', matchNo: 7 },
      b: { kind: 'winnerOf', matchNo: 8 },
      dependsOn: [7, 8],
    });
  });

  it('semis need at least 4 teams', () => {
    expect(() => generateFixtures(ids(3), 'league_semi_final')).toThrowError(EngineError);
  });
});

describe('knockout', () => {
  it('seed order for 8 is the standard bracket', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(2)).toEqual([1, 2]);
  });

  it('8 teams: 7 matches, 1v8 4v5 2v7 3v6, then semis and final', () => {
    const f = knockoutFixtures(ids(8));
    expect(f).toHaveLength(7);
    expect(f.slice(0, 4).map((m) => `${teamOf(m.a)}-${teamOf(m.b)}`)).toEqual([
      't1-t8',
      't4-t5',
      't2-t7',
      't3-t6',
    ]);
    expect(f.slice(0, 4).every((m) => m.stage === 'quarter_final')).toBe(true);
    expect(f[4]).toMatchObject({ stage: 'semi_final', a: { kind: 'winnerOf', matchNo: 1 }, b: { kind: 'winnerOf', matchNo: 2 }, dependsOn: [1, 2] });
    expect(f[5]).toMatchObject({ stage: 'semi_final', dependsOn: [3, 4] });
    expect(f[6]).toMatchObject({ stage: 'final', dependsOn: [5, 6] });
  });

  it('6 teams: the top two seeds get byes', () => {
    const f = knockoutFixtures(ids(6));
    expect(f).toHaveLength(5);
    expect(`${teamOf(f[0]!.a)}-${teamOf(f[0]!.b)}`).toBe('t4-t5');
    expect(`${teamOf(f[1]!.a)}-${teamOf(f[1]!.b)}`).toBe('t3-t6');
    // t1 and t2 first appear in the semi-finals
    expect(f[2]).toMatchObject({ a: { kind: 'team', teamId: 't1' }, b: { kind: 'winnerOf', matchNo: 1 }, dependsOn: [1] });
    expect(f[3]).toMatchObject({ a: { kind: 'team', teamId: 't2' }, b: { kind: 'winnerOf', matchNo: 2 }, dependsOn: [2] });
    expect(f[4]).toMatchObject({ stage: 'final', dependsOn: [3, 4] });
  });

  it('3 teams: seed 1 waits in the final', () => {
    const f = knockoutFixtures(ids(3));
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ stage: 'semi_final' });
    expect(f[1]).toMatchObject({ stage: 'final', a: { kind: 'team', teamId: 't1' }, b: { kind: 'winnerOf', matchNo: 1 } });
  });

  it('2 teams: just a final', () => {
    const f = knockoutFixtures(ids(2));
    expect(f).toHaveLength(1);
    expect(f[0]!.stage).toBe('final');
  });

  it('n teams always make n-1 matches', () => {
    for (let n = 2; n <= 20; n++) expect(knockoutFixtures(ids(n))).toHaveLength(n - 1);
  });
});
