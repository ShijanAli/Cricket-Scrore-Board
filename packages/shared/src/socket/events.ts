import type { InningsState } from '../types/innings-state';
import type { MatchStatus } from '../constants/enums';

/** Event names. Import these; never type the strings by hand. */
export const LIVE_EVENTS = {
  client: {
    joinMatch: 'match:join',
    leaveMatch: 'match:leave',
    scorerLock: 'scorer:lock',
    scorerRelease: 'scorer:release',
  },
  server: {
    scoreUpdated: 'score:updated',
    scorerChanged: 'scorer:changed',
    matchStatus: 'match:status',
    error: 'live:error',
  },
} as const;

export const LIVE_NAMESPACE = '/live';
export const matchRoom = (matchId: string) => `match:${matchId}`;

export interface JoinMatchPayload {
  matchId: string;
}

export interface ScoreUpdatedPayload {
  matchId: string;
  inningsNo: number;
  innings: InningsState;
  /** Server-side monotonically increasing sequence of the last applied event. */
  lastSeq: number;
}

export interface ScorerChangedPayload {
  matchId: string;
  scorerUserId: string | null;
}

export interface MatchStatusPayload {
  matchId: string;
  status: MatchStatus;
}

export interface LiveErrorPayload {
  code: string;
  message: string;
}

/** Typed socket.io event maps, reused by server and client. */
export interface ServerToClientEvents {
  [LIVE_EVENTS.server.scoreUpdated]: (p: ScoreUpdatedPayload) => void;
  [LIVE_EVENTS.server.scorerChanged]: (p: ScorerChangedPayload) => void;
  [LIVE_EVENTS.server.matchStatus]: (p: MatchStatusPayload) => void;
  [LIVE_EVENTS.server.error]: (p: LiveErrorPayload) => void;
}

export interface ClientToServerEvents {
  [LIVE_EVENTS.client.joinMatch]: (p: JoinMatchPayload, ack?: (ok: boolean) => void) => void;
  [LIVE_EVENTS.client.leaveMatch]: (p: JoinMatchPayload) => void;
  [LIVE_EVENTS.client.scorerLock]: (p: JoinMatchPayload, ack?: (ok: boolean) => void) => void;
  [LIVE_EVENTS.client.scorerRelease]: (p: JoinMatchPayload) => void;
}
