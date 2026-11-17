import type { BallEvent, InningsSetup, MatchRules } from '@cricket/shared';
import type { InningsState } from '@cricket/shared';
import { canUndo, EngineError, replayInnings } from '@cricket/engine';
import { AppError } from '../../lib/errors';

export interface IngestInput {
  setup: InningsSetup;
  rules: MatchRules;
  target: number | null;
  /** Events already stored, in seq order. */
  existing: readonly BallEvent[];
  /** Events sent by the phone, in the order the scorer tapped them. */
  incoming: readonly BallEvent[];
  lastSeq: number;
  /** Playing XI ids. When given, every player id inside an event must belong to the right side. */
  battingXI?: ReadonlySet<string>;
  bowlingXI?: ReadonlySet<string>;
}

export interface IngestPlan {
  toInsert: { event: BallEvent; seq: number }[];
  /** Ids that were already stored (a retried sync). Ignored, not an error. */
  duplicateIds: string[];
  /** Innings state after applying everything. */
  state: InningsState;
}

const reject = (code: string, message: string, event: BallEvent, index: number) =>
  new AppError(422, code, message, { eventId: event.id, index });

function checkPlayers(e: BallEvent, batting?: ReadonlySet<string>, bowling?: ReadonlySet<string>): string | null {
  const bat = (id: string) => (batting && !batting.has(id) ? `Player ${id} is not in the batting XI` : null);
  const bowl = (id: string) => (bowling && !bowling.has(id) ? `Player ${id} is not in the bowling XI` : null);
  switch (e.type) {
    case 'delivery':
      return (
        bat(e.strikerId) ??
        bowl(e.bowlerId) ??
        (e.wicket ? bat(e.wicket.playerOutId) : null) ??
        (e.wicket?.fielderId ? bowl(e.wicket.fielderId) : null)
      );
    case 'batterIn':
    case 'retire':
      return bat(e.batterId);
    case 'bowlerSelected':
      return bowl(e.bowlerId);
    default:
      return null;
  }
}

/**
 * Decide what to store. Pure: no database, so every rule here is unit tested.
 * The whole batch is atomic: the first invalid event rejects everything, so the phone
 * can show exactly which ball is wrong and nothing is half saved.
 */
export function planIngest(input: IngestInput): IngestPlan {
  const known = new Set(input.existing.map((e) => e.id));
  const log: BallEvent[] = [...input.existing];
  const toInsert: IngestPlan['toInsert'] = [];
  const duplicateIds: string[] = [];
  let seq = input.lastSeq;

  input.incoming.forEach((event, index) => {
    if (known.has(event.id)) {
      duplicateIds.push(event.id);
      return;
    }

    const playerProblem = checkPlayers(event, input.battingXI, input.bowlingXI);
    if (playerProblem) throw reject('PLAYER_NOT_IN_XI', playerProblem, event, index);

    try {
      if (event.type === 'undo') {
        // Check this first: replaying a log with a mid-log event removed would fail with a
        // confusing STRIKER_MISMATCH instead of telling the scorer what is wrong.
        if (!log.some((e) => e.id === event.targetEventId)) {
          throw new EngineError('UNDO_INVALID', 'Undo target does not exist');
        }
        if (!canUndo(log, event.targetEventId)) {
          throw new EngineError('UNDO_NOT_APPLICABLE', 'Only the latest scored event can be undone');
        }
      }
      log.push(event);
      // Replaying the log validates the event against the cricket rules (throws EngineError).
      replayInnings(input.setup, input.rules, log, input.target);
    } catch (e) {
      if (e instanceof EngineError) throw reject(e.code, e.message, event, index);
      throw e;
    }

    known.add(event.id);
    seq += 1;
    toInsert.push({ event, seq });
  });

  return {
    toInsert,
    duplicateIds,
    state: replayInnings(input.setup, input.rules, log, input.target),
  };
}
