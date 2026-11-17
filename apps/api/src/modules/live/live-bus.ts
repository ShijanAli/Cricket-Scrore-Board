import type { MatchStatusPayload, ScoreUpdatedPayload, ScorerChangedPayload } from '@cricket/shared';
import { logger } from '../../lib/logger';

/**
 * Services publish here and never import socket.io. The LiveGateway attaches itself at startup.
 * This keeps services testable and makes it easy to swap in a Redis adapter later.
 */
export interface LiveSink {
  scoreUpdated(p: ScoreUpdatedPayload): void;
  scorerChanged(p: ScorerChangedPayload): void;
  matchStatus(p: MatchStatusPayload): void;
}

let sink: LiveSink | null = null;

/** A broken socket must never fail a scoring request that already committed. */
const safe = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    logger.error('live emit failed', e);
  }
};

export const liveBus = {
  attach: (s: LiveSink) => {
    sink = s;
  },
  detach: () => {
    sink = null;
  },
  scoreUpdated: (p: ScoreUpdatedPayload) => safe(() => sink?.scoreUpdated(p)),
  scorerChanged: (p: ScorerChangedPayload) => safe(() => sink?.scorerChanged(p)),
  matchStatus: (p: MatchStatusPayload) => safe(() => sink?.matchStatus(p)),
};
