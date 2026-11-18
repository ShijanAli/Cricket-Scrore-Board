import { describe, expect, it } from 'vitest';
import { generateFixtures } from '../tournament/fixtures';
import { assertValidGroups, drawGroups, groupOfStage } from '../tournament/groups';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

describe('drawGroups', () => {
  it('16 teams, 4 groups: snake by seed, 4 each', () => {
    const g = drawGroups(ids(16), 4);
    expect(g.map((x) => x.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(g.map((x) => x.teamIds.length)).toEqual([4, 4, 4, 4]);
    expect(g[0]!.teamIds).toEqual(['t1', 't8', 't9', 't16']);
    expect(g[3]!.teamIds).toEqual(['t4', 't5', 't12', 't13']);
  });
  it('uneven counts differ by one; bad input rejected', () => {
    expect(drawGroups(ids(10), 4).map((x) => x.teamIds.length)).toEqual([3, 3, 2, 2]);
    expect(() => drawGroups(ids(5), 4)).toThrow();
    expect(() => drawGroups(ids(9), 3)).toThrow();
    expect(() => assertValidGroups([{ name: 'A', teamIds: ['x'] }, { name: 'B', teamIds: ['y', 'z'] }], 2)).toThrow();
    expect(() => assertValidGroups([{ name: 'A', teamIds: ['x', 'y'] }, { name: 'B', teamIds: ['y', 'z'] }], 2)).toThrow();
  });
});

describe('groups + knockout fixtures', () => {
  const groups = drawGroups(ids(16), 4);
  const f = generateFixtures(ids(16), 'groups_knockout', { groups });

  it('6 matches per group (24) + 4 QF + 2 SF + final = 31', () => {
    expect(f).toHaveLength(31);
    for (const name of ['A', 'B', 'C', 'D']) {
      const m = f.filter((x) => groupOfStage(x.stage) === name);
      expect(m).toHaveLength(6);
      // all inside the group
      const teams = new Set(groups.find((g) => g.name === name)!.teamIds);
      for (const x of m) {
        expect(x.a.kind === 'team' && teams.has(x.a.teamId)).toBe(true);
        expect(x.b.kind === 'team' && teams.has(x.b.teamId)).toBe(true);
      }
    }
    expect(f.map((x) => x.matchNo)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('everyone plays everyone in the group exactly once', () => {
    const m = f.filter((x) => x.stage === 'group_A');
    const pairs = new Set(m.map((x) => [(x.a as any).teamId, (x.b as any).teamId].sort().join('-')));
    expect(pairs.size).toBe(6);
  });

  it('quarter-finals cross groups: 1A v 2B, 1C v 2D, 1B v 2A, 1D v 2C', () => {
    const qf = f.filter((x) => x.stage === 'quarter_final');
    const label = (s: any) => `${s.position}${s.group}`;
    expect(qf.map((x) => `${label(x.a)} v ${label(x.b)}`)).toEqual(['1A v 2B', '1C v 2D', '1B v 2A', '1D v 2C']);
    expect(qf.every((x) => x.dependsOn.length === 24)).toBe(true);
  });

  it('semi-finals and final chain the winners; same-group sides only meet in the final', () => {
    const sf = f.filter((x) => x.stage === 'semi_final');
    const [qf1, qf2, qf3, qf4] = f.filter((x) => x.stage === 'quarter_final').map((x) => x.matchNo);
    expect(sf.map((x) => [x.a, x.b])).toEqual([
      [{ kind: 'winnerOf', matchNo: qf1 }, { kind: 'winnerOf', matchNo: qf2 }],
      [{ kind: 'winnerOf', matchNo: qf3 }, { kind: 'winnerOf', matchNo: qf4 }],
    ]);
    const fin = f[f.length - 1]!;
    expect(fin.stage).toBe('final');
    expect(fin.dependsOn).toEqual(sf.map((x) => x.matchNo));
    // rounds strictly increase from group stage to final
    const rounds = [...new Set(f.map((x) => x.round))];
    expect(rounds).toEqual([...rounds].sort((a, b) => a - b));
  });

  it('2 groups go straight to semi-finals; 8 groups to a round of 16', () => {
    const two = generateFixtures(ids(8), 'groups_knockout', { groups: drawGroups(ids(8), 2) });
    expect(two.filter((x) => x.stage === 'semi_final')).toHaveLength(2);
    expect(two.at(-1)!.stage).toBe('final');
    const eight = generateFixtures(ids(32), 'groups_knockout', { groups: drawGroups(ids(32), 8) });
    expect(eight.filter((x) => x.stage === 'round_of_16')).toHaveLength(8);
    expect(eight.filter((x) => x.stage === 'quarter_final')).toHaveLength(4);
  });

  it('double round robin doubles group matches; groups required', () => {
    const d = generateFixtures(ids(16), 'groups_knockout', { groups, doubleRoundRobin: true });
    expect(d.filter((x) => x.stage === 'group_A')).toHaveLength(12);
    expect(() => generateFixtures(ids(16), 'groups_knockout')).toThrow();
  });
});
