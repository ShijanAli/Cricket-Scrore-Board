import { describe, expect, it } from 'vitest';
import {
  BOWLER_CREDITED_WICKETS,
  deliveryEventSchema,
  type BallEvent,
  type InningsState,
  type MatchRules,
} from '@cricket/shared';
import { applyEvent } from '../innings/apply-event';
import { replayInnings } from '../innings/replay';
import { createInnings } from '../innings/state';
import { makeRules, setup } from './helpers';

/** Small deterministic PRNG (mulberry32) so failures are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(seed: number, rules: MatchRules, target: number | null) {
  const rand = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  let state: InningsState = createInnings(setup, rules, target);
  const events: BallEvent[] = [];
  let n = 0;
  const id = () => `s${seed}-${n++}`;
  const push = (e: BallEvent) => {
    state = applyEvent(state, e, rules);
    events.push(e);
  };
  let nextBatter = 3;
  const bowlerPool = ['b1', 'b2', 'b3', 'b4'];

  for (let guard = 0; guard < 2000 && state.status === 'inProgress'; guard++) {
    if (state.needsNewBatter) {
      push({ id: id(), type: 'batterIn', batterId: `a${nextBatter++}` });
      continue;
    }
    if (state.needsNewBowler) {
      const eligible = bowlerPool.filter((b) => {
        if (b === state.previousBowlerId) return false;
        const st = state.bowlers[b];
        return !(
          rules.maxOversPerBowler !== null &&
          st &&
          st.legalBalls >= rules.maxOversPerBowler * rules.ballsPerOver
        );
      });
      if (eligible.length === 0) break; // quota deadlock is a rules/config matter, not an engine bug
      push({ id: id(), type: 'bowlerSelected', bowlerId: pick(eligible) });
      continue;
    }
    if (rand() < 0.04 && state.nonStrikerId !== null) {
      push({ id: id(), type: 'strikeSwap' });
      continue;
    }

    const extra = pick(['none', 'none', 'none', 'none', 'wide', 'noBall', 'bye', 'legBye'] as const);
    const restricted = extra === 'noBall' || state.freeHit;
    let runs = extra === 'bye' || extra === 'legBye' ? pick([1, 2, 4]) : pick([0, 0, 0, 1, 1, 2, 3, 4, 6]);
    const boundary = (runs === 4 || runs === 6) && rand() < 0.8;
    let wicket: unknown = undefined;
    if (rand() < 0.12) {
      const type = restricted
        ? pick(['runOut', 'obstructingField'] as const)
        : extra === 'wide'
          ? pick(['stumped', 'runOut', 'hitWicket'] as const)
          : extra === 'bye' || extra === 'legBye'
            ? 'runOut'
            : pick(['bowled', 'caught', 'lbw', 'runOut', 'stumped'] as const);
      const striker = state.strikerId!;
      const playerOutId =
        type === 'runOut' && state.nonStrikerId && rand() < 0.5 ? state.nonStrikerId : striker;
      const mustBeStriker = (BOWLER_CREDITED_WICKETS as readonly string[]).includes(type);
      if (mustBeStriker) runs = 0;
      wicket = { type, playerOutId: mustBeStriker ? striker : playerOutId };
      if (extra === 'bye' || extra === 'legBye') runs = Math.max(1, runs);
    }
    const e = deliveryEventSchema.parse({
      id: id(),
      type: 'delivery',
      strikerId: state.strikerId,
      bowlerId: state.bowlerId,
      runs,
      extra,
      boundary: boundary && runs >= 4,
      wicket,
    });
    push(e);
  }
  return { state, events };
}

function checkInvariants(s: InningsState) {
  const batters = Object.values(s.batters);
  const bowlers = Object.values(s.bowlers);
  const extrasTotal = s.extras.wide + s.extras.noBall + s.extras.bye + s.extras.legBye;

  // Every run is either off a bat or an extra.
  expect(batters.reduce((t, b) => t + b.runs, 0) + extrasTotal).toBe(s.runs);
  // Bowlers concede everything except byes and leg byes.
  expect(bowlers.reduce((t, b) => t + b.runs, 0)).toBe(s.runs - s.extras.bye - s.extras.legBye);
  // Legal balls add up.
  expect(bowlers.reduce((t, b) => t + b.legalBalls, 0)).toBe(s.legalBalls);
  // Wickets: one per dismissed batter; bowlers only get credited ones.
  expect(batters.filter((b) => b.status === 'out').length).toBe(s.wickets);
  expect(s.fallOfWickets).toHaveLength(s.wickets);
  expect(bowlers.reduce((t, b) => t + b.wickets, 0)).toBe(
    batters.filter((b) => b.out && b.out.type !== 'retiredOut' && 'bowlerId' in b.out).length,
  );
  // Limits.
  expect(s.legalBalls).toBeLessThanOrEqual(s.maxBalls);
  expect(s.wickets).toBeLessThanOrEqual(s.maxWickets);
  // Nobody is both at the crease and out.
  for (const id of [s.strikerId, s.nonStrikerId]) {
    if (id) expect(s.batters[id]!.status).toBe('batting');
  }
  if (s.strikerId && s.nonStrikerId) expect(s.strikerId).not.toBe(s.nonStrikerId);
  // Batter ids are unique in batting order.
  expect(new Set(s.battingOrder).size).toBe(s.battingOrder.length);
}

describe('fuzz: random matches keep every invariant', () => {
  const configs: [string, MatchRules, number | null][] = [
    ['2 overs, 4 players', makeRules(), null],
    ['5 overs, 11 players, bowler quota', makeRules({ oversPerInnings: 5, playersPerSide: 11, maxOversPerBowler: 2 }), null],
    ['3 overs, last man stands', makeRules({ oversPerInnings: 3, playersPerSide: 5, lastManStands: true }), null],
    ['chasing 25', makeRules({ oversPerInnings: 4, playersPerSide: 6 }), 25],
    ['8 ball overs, no free hit', makeRules({ oversPerInnings: 2, ballsPerOver: 8, freeHitOnNoBall: false }), null],
  ];

  for (const [name, rules, target] of configs) {
    it(name, () => {
      let completed = 0;
      let withWickets = 0;
      for (let seed = 1; seed <= 150; seed++) {
        const { state, events } = simulate(seed, rules, target);
        if (state.status === 'completed') completed++;
        if (state.wickets > 0) withWickets++;
        checkInvariants(state);
        // The event log is the single source of truth.
        expect(replayInnings(setup, rules, events, target)).toEqual(state);
      }
      // Make sure the simulation really plays full innings with dismissals (not vacuous).
      expect(completed).toBeGreaterThan(120);
      expect(withWickets).toBeGreaterThan(100); // a chase can end on target before any wicket
    });
  }
});
