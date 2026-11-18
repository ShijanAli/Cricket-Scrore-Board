import { createInnings } from '@cricket/engine';
import { deliveryEventSchema, matchRulesSchema, type InningsState } from '@cricket/shared';
import { applyEvent } from '@cricket/engine';
import { describe, expect, it } from 'vitest';
import { CelebrationTracker, celebrationView } from '../celebrations';

const rules = matchRulesSchema.parse({ oversPerInnings: 20, playersPerSide: 11 });
const setup = { battingTeamId: 'A', bowlingTeamId: 'B', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' };
let n = 0;
const ball = (s: InningsState, extra: object = {}) =>
  applyEvent(
    s,
    deliveryEventSchema.parse({ id: `e${++n}`, type: 'delivery', strikerId: s.strikerId!, bowlerId: s.bowlerId!, runs: 0, ...extra }),
    rules,
  );
const view = (c: Parameters<typeof celebrationView>[0]) =>
  celebrationView(c, { playerName: (id) => (id === 'a1' ? 'Rahim' : 'Someone'), teamName: (id) => (id === 'A' ? 'Alpha' : 'Beta') });

describe('CelebrationTracker', () => {
  it('stays quiet on the first snapshot, celebrates the next boundary once', () => {
    const t = new CelebrationTracker();
    const s0 = createInnings(setup, rules);
    expect(t.feed([{ inningsNo: 1, snapshot: s0 }])).toEqual([]);
    const s1 = ball(s0, { runs: 6, boundary: true });
    const first = t.feed([{ inningsNo: 1, snapshot: s1 }]);
    expect(first.map((c) => c.kind)).toEqual(['six']);
    // Polling returns the same snapshot again: no repeat.
    expect(t.feed([{ inningsNo: 1, snapshot: s1 }])).toEqual([]);
  });

  it('treats a big jump as a resync (no celebration)', () => {
    const t = new CelebrationTracker(1);
    const s0 = createInnings(setup, rules);
    t.feed([{ inningsNo: 1, snapshot: s0 }]);
    const far = { ...s0, runs: 120, legalBalls: 30, batters: s0.batters } as InningsState;
    expect(t.feed([{ inningsNo: 1, snapshot: far }])).toEqual([]);
  });

  it('reset forgets state', () => {
    const t = new CelebrationTracker();
    const s0 = createInnings(setup, rules);
    t.feed([{ inningsNo: 1, snapshot: s0 }]);
    t.reset();
    expect(t.feed([{ inningsNo: 1, snapshot: ball(s0, { runs: 4, boundary: true }) }])).toEqual([]);
  });
});

describe('celebrationView', () => {
  it('wording', () => {
    expect(view({ key: 'k', kind: 'six', teamId: 'A', playerId: 'a1' })).toMatchObject({ title: 'SIX!', subtitle: 'Rahim' });
    expect(view({ key: 'k', kind: 'player_milestone', teamId: 'A', playerId: 'a1', value: 100 })).toMatchObject({ title: 'CENTURY!', confetti: true });
    expect(view({ key: 'k', kind: 'player_milestone', teamId: 'A', playerId: 'a1', value: 150 }).title).toBe('150!');
    expect(view({ key: 'k', kind: 'team_milestone', teamId: 'A', value: 250 })).toMatchObject({ title: '250 UP!', subtitle: 'Alpha reach 250' });
    expect(view({ key: 'k', kind: 'wicket', teamId: 'B', playerId: 'a1' }).subtitle).toBe('Rahim is out');
  });
});
