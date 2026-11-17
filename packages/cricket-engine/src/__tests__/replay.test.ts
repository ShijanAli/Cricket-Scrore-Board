import { describe, expect, it } from 'vitest';
import type { BallEvent } from '@cricket/shared';
import { EngineError } from '../errors';
import { activeEvents, canUndo, replayInnings } from '../innings/replay';
import { applyEvent } from '../innings/apply-event';
import { createInnings } from '../innings/state';
import { delivery, makeRules, nextId, setup } from './helpers';

const rules = makeRules();

/** Build an event log by applying events one by one so each is valid for its state. */
function buildLog(inputs: Parameters<typeof delivery>[1][]): BallEvent[] {
  let state = createInnings(setup, rules);
  const log: BallEvent[] = [];
  for (const input of inputs) {
    const e = delivery(state, input);
    state = applyEvent(state, e, rules);
    log.push(e);
  }
  return log;
}

describe('replayInnings', () => {
  it('rebuilds the same state as applying events one by one', () => {
    const log = buildLog([{ runs: 1 }, { runs: 4, boundary: true }, { extra: 'wide' }, { runs: 0 }]);
    const replayed = replayInnings(setup, rules, log);
    expect(replayed.runs).toBe(6);
    expect(replayed.legalBalls).toBe(3);
  });

  it('undo removes the target event exactly', () => {
    const log = buildLog([{ runs: 1 }, { runs: 4, boundary: true }]);
    const withUndo: BallEvent[] = [...log, { id: nextId(), type: 'undo', targetEventId: log[1]!.id }];
    const replayed = replayInnings(setup, rules, withUndo);
    const expected = replayInnings(setup, rules, [log[0]!]);
    expect(replayed).toEqual(expected);
    expect(replayed.runs).toBe(1);
  });

  it('events after an undone one can be recorded again (correct entry)', () => {
    const log = buildLog([{ runs: 1 }]);
    const undo: BallEvent = { id: nextId(), type: 'undo', targetEventId: log[0]!.id };
    const fresh = createInnings(setup, rules);
    const corrected = delivery(fresh, { runs: 2 });
    const replayed = replayInnings(setup, rules, [...log, undo, corrected]);
    expect(replayed.runs).toBe(2);
    expect(replayed.strikerId).toBe('a1'); // 2 runs keep strike
  });

  it('activeEvents drops undo markers and undone events', () => {
    const log = buildLog([{ runs: 1 }, { runs: 2 }]);
    const withUndo: BallEvent[] = [...log, { id: nextId(), type: 'undo', targetEventId: log[1]!.id }];
    expect(activeEvents(withUndo).map((e) => e.id)).toEqual([log[0]!.id]);
  });

  it('only the latest active event can be undone', () => {
    const log = buildLog([{ runs: 1 }, { runs: 2 }]);
    expect(canUndo(log, log[1]!.id)).toBe(true);
    expect(canUndo(log, log[0]!.id)).toBe(false);
    const afterUndo: BallEvent[] = [...log, { id: nextId(), type: 'undo', targetEventId: log[1]!.id }];
    expect(canUndo(afterUndo, log[0]!.id)).toBe(true);
  });

  it('rejects undo of a missing event, an undo, or the same event twice', () => {
    const log = buildLog([{ runs: 1 }]);
    const undo: BallEvent = { id: nextId(), type: 'undo', targetEventId: log[0]!.id };
    const run = (events: BallEvent[]) => () => replayInnings(setup, rules, events);

    expect(run([...log, { id: nextId(), type: 'undo', targetEventId: 'nope' }])).toThrowError(EngineError);
    expect(run([...log, undo, { id: nextId(), type: 'undo', targetEventId: undo.id }])).toThrowError(
      EngineError,
    );
    expect(run([...log, undo, { id: nextId(), type: 'undo', targetEventId: log[0]!.id }])).toThrowError(
      EngineError,
    );
  });
});
