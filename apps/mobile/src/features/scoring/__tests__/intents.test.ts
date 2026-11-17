import { describe, expect, it } from 'vitest';
import { createInnings } from '@cricket/engine';
import { deliveryFromIntent } from '../intents';

const rules = {
  oversPerInnings: 2, ballsPerOver: 6, maxOversPerBowler: null, playersPerSide: 4,
  wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastManStands: false,
};
const state = createInnings(
  { battingTeamId: 'A', bowlingTeamId: 'B', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' },
  rules,
);

describe('deliveryFromIntent', () => {
  it('marks 4 and 6 off the bat as boundaries, not 2 or 3', () => {
    expect(deliveryFromIntent(state, { kind: 'runs', runs: 4 })).toMatchObject({ boundary: true });
    expect(deliveryFromIntent(state, { kind: 'runs', runs: 6 })).toMatchObject({ boundary: true });
    expect(deliveryFromIntent(state, { kind: 'runs', runs: 3 })).toMatchObject({ boundary: false });
  });
  it('wide carries extra runs and no boundary', () => {
    expect(deliveryFromIntent(state, { kind: 'wide', extraRuns: 0 })).toMatchObject({ extra: 'wide', runs: 0 });
  });
  it('no-ball boundary only when the runs come off the bat', () => {
    expect(deliveryFromIntent(state, { kind: 'noBall', batRuns: 4 })).toMatchObject({ boundary: true });
    expect(deliveryFromIntent(state, { kind: 'noBall', batRuns: 4, from: 'bye' })).toMatchObject({ boundary: false });
  });
  it('wicket uses the current striker and bowler', () => {
    const e = deliveryFromIntent(state, {
      kind: 'wicket', runs: 0, wicket: { type: 'bowled', playerOutId: 'a1' },
    });
    expect(e).toMatchObject({ strikerId: 'a1', bowlerId: 'b1', wicket: { type: 'bowled' } });
  });
  it('throws when no striker or bowler is set', () => {
    expect(() => deliveryFromIntent({ ...state, bowlerId: null }, { kind: 'runs', runs: 1 })).toThrow();
  });
});
