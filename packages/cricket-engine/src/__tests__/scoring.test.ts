import { describe, expect, it } from 'vitest';
import { applyEvent } from '../innings/apply-event';
import { createInnings } from '../innings/state';
import { EngineError } from '../errors';
import { batterIn, bowlerIn, delivery, makeRules, nextId, play, playMany, setup } from './helpers';

const rules = makeRules();
const fresh = () => createInnings(setup, rules);

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof EngineError) return e.code;
    throw e;
  }
  return null;
};

describe('createInnings', () => {
  it('sets up openers, limits and empty stats', () => {
    const s = fresh();
    expect(s.strikerId).toBe('a1');
    expect(s.nonStrikerId).toBe('a2');
    expect(s.bowlerId).toBe('b1');
    expect(s.maxBalls).toBe(12);
    expect(s.maxWickets).toBe(3);
    expect(s.battingOrder).toEqual(['a1', 'a2']);
    expect(s.runs).toBe(0);
  });

  it('rejects identical striker and non-striker', () => {
    expect(code(() => createInnings({ ...setup, nonStrikerId: 'a1' }, rules))).toBe('INVALID_SETUP');
  });
});

describe('runs and strike', () => {
  it('dot ball counts a ball faced and a legal ball', () => {
    const s = play(fresh(), rules);
    expect(s.legalBalls).toBe(1);
    expect(s.batters['a1']!.balls).toBe(1);
    expect(s.thisOver.map((b) => b.label)).toEqual(['0']);
  });

  it('a single swaps strike', () => {
    const s = play(fresh(), rules, { runs: 1 });
    expect(s.runs).toBe(1);
    expect(s.batters['a1']!.runs).toBe(1);
    expect(s.strikerId).toBe('a2');
    expect(s.nonStrikerId).toBe('a1');
  });

  it('two runs keep strike', () => {
    const s = play(fresh(), rules, { runs: 2 });
    expect(s.strikerId).toBe('a1');
  });

  it('a boundary four is counted and keeps strike', () => {
    const s = play(fresh(), rules, { runs: 4, boundary: true });
    expect(s.runs).toBe(4);
    expect(s.batters['a1']!.fours).toBe(1);
    expect(s.strikerId).toBe('a1');
  });

  it('a boundary six is counted', () => {
    const s = play(fresh(), rules, { runs: 6, boundary: true });
    expect(s.batters['a1']!.sixes).toBe(1);
    expect(s.batters['a1']!.runs).toBe(6);
  });

  it('four taken as four run (not boundary) is not a "four"', () => {
    const s = play(fresh(), rules, { runs: 4 });
    expect(s.batters['a1']!.fours).toBe(0);
    expect(s.batters['a1']!.runs).toBe(4);
  });

  it('manual strike swap works and needs both batters', () => {
    const s = applyEvent(fresh(), { id: nextId(), type: 'strikeSwap' }, rules);
    expect(s.strikerId).toBe('a2');
  });
});

describe('over completion', () => {
  it('swaps strike, records a maiden and asks for a new bowler', () => {
    const s = playMany(fresh(), rules, 6);
    expect(s.legalBalls).toBe(6);
    expect(s.bowlerId).toBeNull();
    expect(s.previousBowlerId).toBe('b1');
    expect(s.needsNewBowler).toBe(true);
    expect(s.bowlers['b1']!.maidens).toBe(1);
    expect(s.strikerId).toBe('a2'); // end-of-over swap
  });

  it('cannot bowl before a new bowler is chosen', () => {
    const s = playMany(fresh(), rules, 6);
    expect(code(() => play(s, rules))).toBe('BOWLER_REQUIRED');
  });

  it('same bowler cannot bowl consecutive overs', () => {
    const s = playMany(fresh(), rules, 6);
    expect(code(() => bowlerIn(s, rules, 'b1'))).toBe('CONSECUTIVE_OVERS');
  });

  it('new bowler resets "this over"', () => {
    const s = bowlerIn(playMany(fresh(), rules, 6), rules, 'b2');
    expect(s.bowlerId).toBe('b2');
    expect(s.thisOver).toEqual([]);
    expect(s.needsNewBowler).toBe(false);
  });

  it('a wide in the over spoils the maiden and the over takes 7 deliveries', () => {
    let s = playMany(fresh(), rules, 5);
    s = play(s, rules, { extra: 'wide' });
    expect(s.legalBalls).toBe(5);
    expect(s.needsNewBowler).toBe(false);
    s = play(s, rules);
    expect(s.legalBalls).toBe(6);
    expect(s.bowlers['b1']!.maidens).toBe(0);
  });

  it('leg byes do not spoil a maiden', () => {
    let s = playMany(fresh(), rules, 5);
    s = play(s, rules, { extra: 'legBye', runs: 1 });
    expect(s.bowlers['b1']!.maidens).toBe(1);
    expect(s.bowlers['b1']!.runs).toBe(0);
  });

  it('innings completes when all overs are bowled', () => {
    let s = playMany(fresh(), rules, 6);
    s = bowlerIn(s, rules, 'b2');
    s = playMany(s, rules, 6);
    expect(s.status).toBe('completed');
    expect(s.completedReason).toBe('oversDone');
    expect(s.needsNewBowler).toBe(false);
    expect(code(() => play(s, rules))).toBe('INNINGS_COMPLETED');
  });

  it('enforces the per-bowler over quota', () => {
    const r = makeRules({ oversPerInnings: 3, maxOversPerBowler: 1 });
    let s = createInnings(setup, r);
    s = playMany(s, r, 6);
    s = bowlerIn(s, r, 'b2');
    s = playMany(s, r, 6);
    expect(code(() => bowlerIn(s, r, 'b1'))).toBe('BOWLER_QUOTA_EXCEEDED');
    expect(bowlerIn(s, r, 'b3').bowlerId).toBe('b3');
  });
});

describe('extras', () => {
  it('a wide is not a legal ball and no ball is faced', () => {
    const s = play(fresh(), rules, { extra: 'wide' });
    expect(s.runs).toBe(1);
    expect(s.extras.wide).toBe(1);
    expect(s.legalBalls).toBe(0);
    expect(s.batters['a1']!.balls).toBe(0);
    expect(s.bowlers['b1']!.runs).toBe(1);
    expect(s.bowlers['b1']!.wides).toBe(1);
    expect(s.thisOver[0]!.label).toBe('Wd');
  });

  it('wide plus a run run: 2 total and strike swaps', () => {
    const s = play(fresh(), rules, { extra: 'wide', runs: 1 });
    expect(s.runs).toBe(2);
    expect(s.extras.wide).toBe(2);
    expect(s.strikerId).toBe('a2');
    expect(s.thisOver[0]!.label).toBe('Wd+1');
  });

  it('wide penalty follows the match rules', () => {
    const r = makeRules({ wideRuns: 2 });
    const s = play(createInnings(setup, r), r, { extra: 'wide' });
    expect(s.runs).toBe(2);
  });

  it('no-ball with bat runs: penalty to extras, runs to the batter, ball faced, free hit next', () => {
    const s = play(fresh(), rules, { extra: 'noBall', runs: 2 });
    expect(s.runs).toBe(3);
    expect(s.extras.noBall).toBe(1);
    expect(s.batters['a1']!.runs).toBe(2);
    expect(s.batters['a1']!.balls).toBe(1);
    expect(s.legalBalls).toBe(0);
    expect(s.bowlers['b1']!.runs).toBe(3);
    expect(s.bowlers['b1']!.noBalls).toBe(1);
    expect(s.freeHit).toBe(true);
    expect(s.thisOver[0]!.label).toBe('Nb+2');
  });

  it('no-ball with byes: runs go to byes, not the batter or bowler', () => {
    const s = play(fresh(), rules, { extra: 'noBall', runs: 1, noBallRunsFrom: 'bye' });
    expect(s.runs).toBe(2);
    expect(s.extras.bye).toBe(1);
    expect(s.batters['a1']!.runs).toBe(0);
    expect(s.bowlers['b1']!.runs).toBe(1);
  });

  it('bye: legal ball, runs not charged to the bowler, strike swaps', () => {
    const s = play(fresh(), rules, { extra: 'bye', runs: 1 });
    expect(s.runs).toBe(1);
    expect(s.extras.bye).toBe(1);
    expect(s.legalBalls).toBe(1);
    expect(s.bowlers['b1']!.runs).toBe(0);
    expect(s.batters['a1']!.balls).toBe(1);
    expect(s.strikerId).toBe('a2');
    expect(s.thisOver[0]!.label).toBe('1b');
  });

  it('rejects byes when the match rules forbid them', () => {
    const r = makeRules({ allowByes: false });
    expect(code(() => play(createInnings(setup, r), r, { extra: 'bye', runs: 1 }))).toBe(
      'EXTRA_NOT_ALLOWED',
    );
  });

  it('bye with zero runs is invalid input', () => {
    expect(() => delivery(fresh(), { extra: 'bye', runs: 0 })).toThrow();
  });
});

describe('free hit', () => {
  it('is used up by the next legal ball, wides keep it alive', () => {
    let s = play(fresh(), rules, { extra: 'noBall' });
    expect(s.freeHit).toBe(true);
    s = play(s, rules, { extra: 'wide' });
    expect(s.freeHit).toBe(true);
    s = play(s, rules);
    expect(s.freeHit).toBe(false);
  });

  it('a no-ball on a free hit gives another free hit', () => {
    let s = play(fresh(), rules, { extra: 'noBall' });
    s = play(s, rules, { extra: 'noBall' });
    expect(s.freeHit).toBe(true);
  });

  it('bowled is not allowed on a free hit, run out is', () => {
    const s = play(fresh(), rules, { extra: 'noBall' });
    expect(code(() => play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a1' } }))).toBe(
      'INVALID_WICKET',
    );
    const after = play(s, rules, { wicket: { type: 'runOut', playerOutId: 'a2' } });
    expect(after.wickets).toBe(1);
  });

  it('can be turned off in the rules', () => {
    const r = makeRules({ freeHitOnNoBall: false });
    const s = play(createInnings(setup, r), r, { extra: 'noBall' });
    expect(s.freeHit).toBe(false);
  });
});

describe('wickets', () => {
  const bowled = { wicket: { type: 'bowled', playerOutId: 'a1' } } as const;

  it('bowled: out, bowler credited, new batter required, fall of wicket recorded', () => {
    const s = play(fresh(), rules, { ...bowled });
    expect(s.wickets).toBe(1);
    expect(s.batters['a1']!.status).toBe('out');
    expect(s.batters['a1']!.out).toEqual({ type: 'bowled', bowlerId: 'b1' });
    expect(s.bowlers['b1']!.wickets).toBe(1);
    expect(s.strikerId).toBeNull();
    expect(s.needsNewBatter).toBe(true);
    expect(s.fallOfWickets).toEqual([{ wicketNo: 1, teamRuns: 0, legalBalls: 1, batterId: 'a1' }]);
    expect(s.thisOver[0]!.label).toBe('W');
  });

  it('cannot bowl until the new batter arrives, who takes the striker end', () => {
    const s = play(fresh(), rules, { ...bowled });
    expect(code(() => play(s, rules))).toBe('BATTER_REQUIRED');
    const next = batterIn(s, rules, 'a3');
    expect(next.strikerId).toBe('a3');
    expect(next.nonStrikerId).toBe('a2');
    expect(next.battingOrder).toEqual(['a1', 'a2', 'a3']);
    expect(next.partnership).toEqual({ runs: 0, balls: 0 });
  });

  it('batterIn when none is needed is rejected', () => {
    expect(code(() => batterIn(fresh(), rules, 'a3'))).toBe('NOT_EXPECTED');
  });

  it('a dismissed batter cannot come back in', () => {
    let s = play(fresh(), rules, { ...bowled });
    s = batterIn(s, rules, 'a3');
    s = play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a3' } });
    expect(code(() => batterIn(s, rules, 'a1'))).toBe('INVALID_BATTER');
  });

  it('caught needs zero runs and the striker', () => {
    expect(code(() => play(fresh(), rules, { runs: 1, wicket: { type: 'caught', playerOutId: 'a1' } }))).toBe(
      'INVALID_WICKET',
    );
    expect(code(() => play(fresh(), rules, { wicket: { type: 'bowled', playerOutId: 'a2' } }))).toBe(
      'INVALID_WICKET',
    );
  });

  it('dismissed player must be at the crease', () => {
    expect(code(() => play(fresh(), rules, { wicket: { type: 'runOut', playerOutId: 'zz' } }))).toBe(
      'INVALID_WICKET',
    );
  });

  it('run out of the non-striker after one run: strike swapped first, vacancy at the right end', () => {
    let s = play(fresh(), rules, { runs: 1, wicket: { type: 'runOut', playerOutId: 'a2' } });
    expect(s.runs).toBe(1);
    expect(s.wickets).toBe(1);
    expect(s.batters['a2']!.out).toEqual({ type: 'runOut' }); // not credited to the bowler
    expect(s.bowlers['b1']!.wickets).toBe(0);
    expect(s.strikerId).toBeNull(); // a2 had crossed to the striker end
    expect(s.nonStrikerId).toBe('a1');
    s = batterIn(s, rules, 'a3');
    expect(s.strikerId).toBe('a3');
  });

  it('wicket on ball 6 of an over (striker out): batter in goes to non-striker end, partner faces', () => {
    let s = playMany(fresh(), rules, 5);
    expect(s.strikerId).toBe('a1');
    s = play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a1' } });
    expect(s.needsNewBatter).toBe(true);
    expect(s.needsNewBowler).toBe(true);
    expect(s.strikerId).toBe('a2');
    expect(s.nonStrikerId).toBeNull();
    s = batterIn(s, rules, 'a3');
    expect(s.strikerId).toBe('a2');
    expect(s.nonStrikerId).toBe('a3');
  });

  it('stumped is allowed on a wide, bowled is not', () => {
    const w = play(fresh(), rules, { extra: 'wide', wicket: { type: 'stumped', playerOutId: 'a1' } });
    expect(w.wickets).toBe(1);
    expect(w.legalBalls).toBe(0);
    expect(code(() => play(fresh(), rules, { extra: 'wide', wicket: { type: 'bowled', playerOutId: 'a1' } }))).toBe(
      'INVALID_WICKET',
    );
  });

  it('all out ends the innings', () => {
    let s = play(fresh(), rules, { wicket: { type: 'bowled', playerOutId: 'a1' } });
    s = batterIn(s, rules, 'a3');
    s = play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a3' } });
    s = batterIn(s, rules, 'a4');
    s = play(s, rules, { wicket: { type: 'bowled', playerOutId: 'a4' } });
    expect(s.wickets).toBe(3);
    expect(s.status).toBe('completed');
    expect(s.completedReason).toBe('allOut');
    expect(s.needsNewBatter).toBe(false);
  });
});

describe('retirements', () => {
  it('retired hurt is not a wicket and needs a replacement', () => {
    let s = applyEvent(fresh(), { id: nextId(), type: 'retire', batterId: 'a2', reason: 'hurt' }, rules);
    expect(s.wickets).toBe(0);
    expect(s.batters['a2']!.status).toBe('retiredHurt');
    expect(s.nonStrikerId).toBeNull();
    expect(s.needsNewBatter).toBe(true);
    s = batterIn(s, rules, 'a3');
    expect(s.nonStrikerId).toBe('a3');
  });

  it('retired out counts as a wicket, not the bowler\'s', () => {
    const s = applyEvent(fresh(), { id: nextId(), type: 'retire', batterId: 'a2', reason: 'out' }, rules);
    expect(s.wickets).toBe(1);
    expect(s.batters['a2']!.out).toEqual({ type: 'retiredOut' });
    expect(s.bowlers['b1']!.wickets).toBe(0);
  });

  it('a batter who is not at the crease cannot retire', () => {
    expect(
      code(() => applyEvent(fresh(), { id: nextId(), type: 'retire', batterId: 'zz', reason: 'hurt' }, rules)),
    ).toBe('INVALID_RETIRE');
  });
});

describe('last man stands', () => {
  const r = makeRules({ playersPerSide: 3, lastManStands: true });

  it('the last batter bats alone and never swaps strike; innings ends at players-per-side wickets', () => {
    let s = createInnings(setup, r);
    expect(s.maxWickets).toBe(3);
    s = play(s, r, { wicket: { type: 'bowled', playerOutId: 'a1' } });
    s = batterIn(s, r, 'a3');
    s = play(s, r, { wicket: { type: 'bowled', playerOutId: 'a3' } });
    expect(s.needsNewBatter).toBe(false);
    expect(s.strikerId).toBe('a2');
    expect(s.nonStrikerId).toBeNull();
    s = play(s, r, { runs: 1 });
    expect(s.strikerId).toBe('a2'); // no swap
    expect(s.batters['a2']!.runs).toBe(1);
    s = play(s, r, { wicket: { type: 'bowled', playerOutId: 'a2' } });
    expect(s.status).toBe('completed');
    expect(s.completedReason).toBe('allOut');
  });
});

describe('guards', () => {
  it('rejects a stale striker or bowler', () => {
    const s = fresh();
    expect(code(() => applyEvent(s, delivery(s, { strikerId: 'a2' }), rules))).toBe('STRIKER_MISMATCH');
    expect(code(() => applyEvent(s, delivery(s, { bowlerId: 'b9' }), rules))).toBe('BOWLER_MISMATCH');
  });

  it('is pure: the previous state is never mutated', () => {
    const s = fresh();
    const snapshot = JSON.stringify(s);
    play(s, rules, { runs: 4, boundary: true });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
