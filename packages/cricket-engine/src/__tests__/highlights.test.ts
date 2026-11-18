import { describe, expect, it } from 'vitest';
import { createInnings } from '../innings/state';
import { detectCelebrations } from '../match/highlights';
import { buildMatchReport } from '../match/report';
import { computeImpact, mergeImpacts, pickBestPlayer, topRunScorer, topWicketTaker } from '../match/awards';
import { batterIn, bowlerIn, makeRules, play, playMany, setup } from './helpers';
import type { DeliveryEventInput, InningsState } from '@cricket/shared';

const rules = makeRules({ oversPerInnings: 20, playersPerSide: 11 });
const fresh = () => createInnings(setup, rules);
/** Like play(), but picks the next bowler at the start of each over. */
const ball = (s: InningsState, input: Partial<DeliveryEventInput> = {}) => {
  const ready = s.needsNewBowler ? bowlerIn(s, rules, s.previousBowlerId === 'b1' ? 'b2' : 'b1') : s;
  return play(ready, rules, input);
};
const over = (s: InningsState, input: Partial<DeliveryEventInput> = {}) => {
  let x = s;
  for (let i = 0; i < 6; i++) x = ball(x, input);
  return x;
};
const four = { runs: 4, boundary: true } as const;
const six = { runs: 6, boundary: true } as const;
const kinds = (c: ReturnType<typeof detectCelebrations>) => c.map((x) => x.kind);

describe('detectCelebrations', () => {
  it('nothing for the first snapshot, a dot ball or an undo', () => {
    const s = fresh();
    expect(detectCelebrations(null, s)).toEqual([]);
    expect(detectCelebrations(s, play(s, rules))).toEqual([]);
    const after = play(s, rules, { runs: 4, boundary: true });
    expect(detectCelebrations(after, s)).toEqual([]);
  });

  it('four and six', () => {
    const s = fresh();
    const four = play(s, rules, { runs: 4, boundary: true });
    expect(detectCelebrations(s, four)).toMatchObject([{ kind: 'four', playerId: 'a1' }]);
    const six = play(s, rules, { runs: 6, boundary: true });
    expect(detectCelebrations(s, six)).toMatchObject([{ kind: 'six', playerId: 'a1' }]);
  });

  it('running 4 without boundary is not a four', () => {
    const s = fresh();
    expect(detectCelebrations(s, play(s, rules, { runs: 4 }))).toEqual([]);
  });

  it('wicket names the dismissed batter', () => {
    const s = fresh();
    const w = play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a1' } });
    expect(detectCelebrations(s, w)).toMatchObject([{ kind: 'wicket', playerId: 'a1', teamId: 'B' }]);
  });

  it('player 50 and team 50 together: milestones first, then the six', () => {
    let s = fresh();
    s = over(s, four); // a1 24
    s = over(s); // a2 dots
    s = over(s, four); // a1 48
    s = over(s); // a2 dots
    expect(s.batters.a1!.runs).toBe(48);
    expect(s.strikerId).toBe('a1');
    const next = ball(s, six);
    const c = detectCelebrations(s, next);
    expect(kinds(c)).toEqual(['team_milestone', 'player_milestone', 'six']);
    expect(c[0]).toMatchObject({ value: 50, teamId: 'A' });
    expect(c[1]).toMatchObject({ value: 50, playerId: 'a1' });
  });

  it('team milestones at 50, 100, 150, 200 and never twice', () => {
    let s = fresh();
    const seen: number[] = [];
    for (let i = 0; i < 40 && s.status !== 'completed'; i++) {
      const next = ball(s, six);
      for (const c of detectCelebrations(s, next)) if (c.kind === 'team_milestone') seen.push(c.value!);
      s = next;
    }
    expect(seen).toEqual([50, 100, 150, 200]);
  });

  it('keys differ per ball', () => {
    const s = fresh();
    const a = ball(s, four);
    const b = ball(a, four);
    expect(detectCelebrations(s, a)[0]!.key).not.toBe(detectCelebrations(a, b)[0]!.key);
  });
});

describe('awards and report', () => {
  const second = { battingTeamId: 'B', bowlingTeamId: 'A', strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a9' };
  const r1 = makeRules({ oversPerInnings: 1, playersPerSide: 4 });

  const build = () => {
    let first = createInnings(setup, r1);
    first = playMany(first, r1, 5, { runs: 4, boundary: true });
    first = play(first, r1, { runs: 6, boundary: true }); // 26
    let chase = createInnings(second, r1, first.runs + 1);
    chase = play(chase, r1, { wicket: { type: 'bowled', playerOutId: 'b1' } });
    chase = batterIn(chase, r1, 'b3');
    chase = playMany(chase, r1, 5, { runs: 1 });
    return { first, chase };
  };

  it('won by runs: margin, winner, loser and awards', () => {
    const { first, chase } = build();
    const r = buildMatchReport(first, chase)!;
    expect(r.result).toEqual({ type: 'won_by_runs', winnerTeamId: 'A', margin: 26 - 5 });
    expect(r.winnerTeamId).toBe('A');
    expect(r.loserTeamId).toBe('B');
    expect(r.marginKind).toBe('runs');
    expect(r.manOfTheMatch?.playerId).toBe('a1'); // 26 runs, 5 fours + 1 six
    expect(r.topBatter?.playerId).toBe('a1');
    expect(r.topBowler?.playerId).toBe('a9');
  });

  it('chase: wickets margin and balls left', () => {
    const first = playMany(createInnings(setup, r1), r1, 6, { runs: 1 });
    let chase = createInnings(second, r1, first.runs + 1);
    chase = play(chase, r1, { runs: 4, boundary: true });
    chase = play(chase, r1, { runs: 3 });
    const r = buildMatchReport(first, chase)!;
    expect(r).toMatchObject({ winnerTeamId: 'B', loserTeamId: 'A', marginKind: 'wickets', margin: 3, ballsLeft: 4 });
  });

  it('null while unfinished, and tie has no winner', () => {
    const first = playMany(createInnings(setup, r1), r1, 6, { runs: 1 });
    expect(buildMatchReport(first, createInnings(second, r1, 7))).toBeNull();
    expect(buildMatchReport(first, null)).toBeNull();
    let chase = createInnings(second, r1, 7);
    chase = playMany(chase, r1, 6, { runs: 1 });
    const t = buildMatchReport(first, chase)!;
    expect(t.winnerTeamId).toBeNull();
    expect(t.loserTeamId).toBeNull();
    expect(t.marginKind).toBe('tie');
  });

  it('mergeImpacts sums across matches and ranks series leaders', () => {
    const { first, chase } = build();
    const one = computeImpact([first, chase]);
    const merged = mergeImpacts([one, one]);
    const a1 = merged.find((p) => p.playerId === 'a1')!;
    expect(a1.runs).toBe(52);
    expect(pickBestPlayer(merged)?.playerId).toBe('a1');
    expect(topRunScorer(merged)?.playerId).toBe('a1');
    expect(topWicketTaker(merged)?.playerId).toBe('a9');
    expect(pickBestPlayer([])).toBeNull();
  });
});
