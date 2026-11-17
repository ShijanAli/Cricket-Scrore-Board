import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  LIVE_EVENTS,
  LIVE_NAMESPACE,
  type InningsState,
  type MatchStatus,
  type ScoreUpdatedPayload,
} from '@cricket/shared';
import { API_URL } from '@/lib/api';
import { keys } from '@/lib/query';

export interface LiveMatchState {
  connected: boolean;
  /** Latest pushed innings by innings number. Empty until the server sends something. */
  innings: Record<number, InningsState>;
  status: MatchStatus | null;
  scorerUserId: string | null | undefined;
}

/**
 * Watch one match in real time. Joins the room on every (re)connect, so a dropped connection
 * recovers by itself, and the server sends the current state to a late joiner.
 */
export function useLiveMatch(matchId: string | undefined, enabled = true): LiveMatchState {
  const qc = useQueryClient();
  const [state, setState] = useState<LiveMatchState>({
    connected: false,
    innings: {},
    status: null,
    scorerUserId: undefined,
  });

  useEffect(() => {
    if (!matchId || !enabled) return;
    const socket = io(`${API_URL}${LIVE_NAMESPACE}`, { transports: ['websocket'], reconnection: true });

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true }));
      socket.emit(LIVE_EVENTS.client.joinMatch, { matchId });
    });
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));
    socket.on(LIVE_EVENTS.server.scoreUpdated, (p: ScoreUpdatedPayload) => {
      if (p.matchId !== matchId) return;
      setState((s) => ({ ...s, innings: { ...s.innings, [p.inningsNo]: p.innings } }));
    });
    socket.on(LIVE_EVENTS.server.matchStatus, (p: { matchId: string; status: MatchStatus }) => {
      if (p.matchId !== matchId) return;
      setState((s) => ({ ...s, status: p.status }));
      void qc.invalidateQueries({ queryKey: keys.match(matchId) });
    });
    socket.on(LIVE_EVENTS.server.scorerChanged, (p: { matchId: string; scorerUserId: string | null }) => {
      if (p.matchId === matchId) setState((s) => ({ ...s, scorerUserId: p.scorerUserId }));
    });

    return () => {
      socket.emit(LIVE_EVENTS.client.leaveMatch, { matchId });
      socket.disconnect();
    };
  }, [matchId, enabled, qc]);

  return state;
}
