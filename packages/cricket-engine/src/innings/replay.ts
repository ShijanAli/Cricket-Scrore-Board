import type { BallEvent, InningsSetup, InningsState, MatchRules } from '@cricket/shared';
import { EngineError } from '../errors';
import { applyEvent } from './apply-event';
import { createInnings } from './state';

/** Ids removed by undo events, validating each undo points at an earlier, real event. */
function undoneIds(events: readonly BallEvent[]): Set<string> {
  const seen = new Map<string, BallEvent['type']>();
  const undone = new Set<string>();
  for (const e of events) {
    if (e.type === 'undo') {
      const targetType = seen.get(e.targetEventId);
      if (!targetType) throw new EngineError('UNDO_INVALID', 'Undo target does not exist');
      if (targetType === 'undo') throw new EngineError('UNDO_INVALID', 'Cannot undo an undo');
      if (undone.has(e.targetEventId)) throw new EngineError('UNDO_INVALID', 'Event is already undone');
      undone.add(e.targetEventId);
    }
    seen.set(e.id, e.type);
  }
  return undone;
}

/** Events that still count (not undo markers, not undone). */
export function activeEvents(events: readonly BallEvent[]): BallEvent[] {
  const undone = undoneIds(events);
  return events.filter((e) => e.type !== 'undo' && !undone.has(e.id));
}

/** Only the most recent active event can be undone, otherwise later events would break. */
export function canUndo(events: readonly BallEvent[], targetEventId: string): boolean {
  const active = activeEvents(events);
  return active.length > 0 && active[active.length - 1]!.id === targetEventId;
}

/**
 * Rebuild the full innings state from the append-only event log.
 * This is the single source of truth, used by the mobile app, the API and the web viewer.
 */
export function replayInnings(
  setup: InningsSetup,
  rules: MatchRules,
  events: readonly BallEvent[],
  target: number | null = null,
): InningsState {
  let state = createInnings(setup, rules, target);
  for (const e of activeEvents(events)) {
    state = applyEvent(state, e, rules);
  }
  return state;
}
