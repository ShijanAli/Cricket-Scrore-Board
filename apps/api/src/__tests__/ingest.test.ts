import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  deliveryEventSchema,
  matchRulesSchema,
  type BallEvent,
  type DeliveryEventInput,
  type InningsSetup,
} from '@cricket/shared';
import { replayInnings } from '@cricket/engine';
import { AppError } from '../lib/errors';
import { planIngest } from '../modules/matches/ingest';

const rules = matchRulesSchema.parse({ oversPerInnings: 2, playersPerSide: 4 });
const setup: InningsSetup = {
  battingTeamId: 'A',
  bowlingTeamId: 'B',
  strikerId: 'a1',
  nonStrikerId: 'a2',
  bowlerId: 'b1',
};
const battingXI = new Set(['a1', 'a2', 'a3', 'a4']);
const bowlingXI = new Set(['b1', 'b2']);

/** Builds events the way the phone would: always for whoever is on strike right now. */
class Scorer {
  events: BallEvent[] = [];
  state = () => replayInnings(setup, rules, this.events);
  ball(input: Partial<DeliveryEventInput> = {}): BallEvent {
    const s = this.state();
    const e = deliveryEventSchema.parse({
      id: randomUUID(),
      type: 'delivery',
      strikerId: s.strikerId,
      bowlerId: s.bowlerId,
      runs: 0,
      ...input,
    });
    this.events.push(e);
    return e;
  }
  push(e: BallEvent) {
    this.events.push(e);
    return e;
  }
}

const plan = (incoming: BallEvent[], existing: BallEvent[] = [], lastSeq = existing.length) =>
  planIngest({ setup, rules, target: null, existing, incoming, lastSeq, battingXI, bowlingXI });

const rejection = (fn: () => unknown): AppError => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error('expected the plan to be rejected');
};

describe('planIngest', () => {
  it('accepts a batch and numbers events after lastSeq', () => {
    const s = new Scorer();
    s.ball({ runs: 1 });
    s.ball({ runs: 4, boundary: true });
    const p = plan(s.events);
    expect(p.toInsert.map((x) => x.seq)).toEqual([1, 2]);
    expect(p.duplicateIds).toEqual([]);
    expect(p.state.runs).toBe(5);
  });

  it('continues numbering from an existing log', () => {
    const s = new Scorer();
    const first = [s.ball(), s.ball()];
    const next = [s.ball({ runs: 2 })];
    const p = plan(next, first, 2);
    expect(p.toInsert.map((x) => x.seq)).toEqual([3]);
    expect(p.state.runs).toBe(2);
  });

  it('ignores events that are already stored (retried sync)', () => {
    const s = new Scorer();
    const batch = [s.ball({ runs: 1 }), s.ball({ runs: 2 })];
    const retry = plan(batch, batch, 2);
    expect(retry.toInsert).toEqual([]);
    expect(retry.duplicateIds).toEqual(batch.map((e) => e.id));
    expect(retry.state.runs).toBe(3);
  });

  it('stores only the new events when a retry also carries new ones', () => {
    const s = new Scorer();
    const old = [s.ball({ runs: 1 })];
    const fresh = s.ball({ runs: 6, boundary: true });
    const p = plan([...old, fresh], old, 1);
    expect(p.duplicateIds).toEqual([old[0]!.id]);
    expect(p.toInsert).toEqual([{ event: fresh, seq: 2 }]);
  });

  it('rejects the whole batch at the first invalid event, with its id and position', () => {
    const s = new Scorer();
    const good = s.ball({ runs: 1 });
    const bad = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: 'a3', bowlerId: 'b1', runs: 0, // a3 is not on strike
    });
    const err = rejection(() => plan([good, bad]));
    expect(err.status).toBe(422);
    expect(err.code).toBe('STRIKER_MISMATCH');
    expect(err.details).toEqual({ eventId: bad.id, index: 1 });
  });

  it('rejects players outside the playing XI', () => {
    const outsider = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: 'a1', bowlerId: 'zz', runs: 0,
    });
    expect(rejection(() => plan([outsider])).code).toBe('PLAYER_NOT_IN_XI');

    const fielder = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: 'a1', bowlerId: 'b1', runs: 0,
      wicket: { type: 'caught', playerOutId: 'a1', fielderId: 'a3' }, // fielder from the wrong side
    });
    expect(rejection(() => plan([fielder])).code).toBe('PLAYER_NOT_IN_XI');
  });

  it('undo removes the latest event', () => {
    const s = new Scorer();
    s.ball({ runs: 4, boundary: true });
    const last = s.ball({ runs: 6, boundary: true });
    const undo = s.push({ id: randomUUID(), type: 'undo', targetEventId: last.id });
    const p = plan([...s.events.slice(0, 2), undo]);
    expect(p.state.runs).toBe(4);
    expect(p.toInsert).toHaveLength(3);
  });

  it('undo is refused for an event that is not the latest', () => {
    const s = new Scorer();
    const first = s.ball({ runs: 1 });
    s.ball({ runs: 2 });
    const undo: BallEvent = { id: randomUUID(), type: 'undo', targetEventId: first.id };
    expect(rejection(() => plan([...s.events, undo])).code).toBe('UNDO_NOT_APPLICABLE');
  });

  it('undo of an unknown event is refused', () => {
    const undo: BallEvent = { id: randomUUID(), type: 'undo', targetEventId: randomUUID() };
    expect(rejection(() => plan([undo])).code).toBe('UNDO_INVALID');
  });

  it('refuses balls after the innings is complete, but undo can re-open it', () => {
    const s = new Scorer();
    for (let i = 0; i < 6; i++) s.ball();
    s.push({ id: randomUUID(), type: 'bowlerSelected', bowlerId: 'b2' });
    for (let i = 0; i < 6; i++) s.ball();
    const done = plan(s.events);
    expect(done.state.status).toBe('completed');

    const extraBall = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: 'a1', bowlerId: 'b2', runs: 0,
    });
    expect(rejection(() => plan([extraBall], s.events)).code).toBe('INNINGS_COMPLETED');

    const lastBall = s.events[s.events.length - 1]!;
    const undo: BallEvent = { id: randomUUID(), type: 'undo', targetEventId: lastBall.id };
    const reopened = plan([undo], s.events);
    expect(reopened.state.status).toBe('inProgress');
  });

  it('applies cricket rules (wicket needs a new batter before the next ball)', () => {
    const s = new Scorer();
    s.ball({ wicket: { type: 'bowled', playerOutId: 'a1' } });
    const next = deliveryEventSchema.parse({
      id: randomUUID(), type: 'delivery', strikerId: 'a2', bowlerId: 'b1', runs: 0,
    });
    expect(rejection(() => plan([...s.events, next])).code).toBe('BATTER_REQUIRED');
  });

  it('a failed batch is atomic: planning never returns a partial result', () => {
    const s = new Scorer();
    const ok = s.ball({ runs: 2 });
    const bad = deliveryEventSchema.parse({ id: randomUUID(), type: 'delivery', strikerId: 'a1', bowlerId: 'b1', runs: 0 });
    // ok moved nothing on strike (2 runs = even), so `bad` (a1 again) is valid. Make it invalid with a duplicate batter.
    const invalid: BallEvent = { id: randomUUID(), type: 'batterIn', batterId: 'a3' };
    expect(() => plan([ok, bad, invalid])).toThrow(AppError);
  });
});
