import { describe, expect, it } from 'vitest';
import { createInnings } from '../innings/state';
import { chaseInfo, computeResult, describeResult } from '../match/result';
import { makeRules, play, playMany, setup } from './helpers';

const rules = makeRules({ oversPerInnings: 1 }); // 6 balls, 3 wickets max
const secondSetup = { battingTeamId: 'B', bowlingTeamId: 'A', strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a9' };

const firstInnings = () => playMany(createInnings(setup, rules), rules, 6, { runs: 1 }); // 6 runs, completed

describe('first innings fixture', () => {
  it('is completed with 6 runs', () => {
    const f = firstInnings();
    expect(f.runs).toBe(6);
    expect(f.status).toBe('completed');
  });
});

describe('chase and result', () => {
  it('chaseInfo gives target, runs needed and required rate', () => {
    const first = firstInnings();
    let second = createInnings(secondSetup, rules, first.runs + 1);
    second = play(second, rules, { runs: 4, boundary: true });
    const info = chaseInfo(first, second);
    expect(info.target).toBe(7);
    expect(info.runsNeeded).toBe(3);
    expect(info.ballsRemaining).toBe(5);
    expect(info.requiredRunRate).toBeCloseTo(3.6);
  });

  it('chasing team wins by wickets in hand when the target is reached', () => {
    const first = firstInnings();
    let second = createInnings(secondSetup, rules, first.runs + 1);
    second = play(second, rules, { runs: 4, boundary: true });
    second = play(second, rules, { runs: 3 });
    expect(second.completedReason).toBe('targetReached');
    const result = computeResult(first, second)!;
    expect(result).toEqual({ type: 'won_by_wickets', winnerTeamId: 'B', margin: 3 });
    expect(describeResult(result, (id) => `Team ${id}`)).toBe('Team B won by 3 wickets');
  });

  it('defending team wins by runs', () => {
    const first = firstInnings();
    let second = createInnings(secondSetup, rules, first.runs + 1);
    second = playMany(second, rules, 5, { runs: 1 });
    second = play(second, rules, { runs: 0 });
    expect(second.status).toBe('completed');
    const result = computeResult(first, second)!;
    expect(result).toEqual({ type: 'won_by_runs', winnerTeamId: 'A', margin: 1 });
    expect(describeResult(result, (id) => id)).toBe('A won by 1 run');
  });

  it('equal scores tie the match', () => {
    const first = firstInnings();
    const second = playMany(createInnings(secondSetup, rules, first.runs + 1), rules, 6, { runs: 1 });
    expect(computeResult(first, second)).toEqual({ type: 'tie', winnerTeamId: null, margin: 0 });
  });

  it('no result while the chase is still in progress', () => {
    const first = firstInnings();
    const second = play(createInnings(secondSetup, rules, first.runs + 1), rules);
    expect(computeResult(first, second)).toBeNull();
  });

  it('no result while the first innings is in progress', () => {
    const first = play(createInnings(setup, rules), rules);
    const second = createInnings(secondSetup, rules, 2);
    expect(computeResult(first, second)).toBeNull();
  });
});
