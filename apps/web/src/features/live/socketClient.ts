import { io, type Socket } from 'socket.io-client';
import {
  LIVE_EVENTS,
  LIVE_NAMESPACE,
  type MatchStatusPayload,
  type ScoreUpdatedPayload,
  type ScorerChangedPayload,
} from '@cricket/shared';
import { env } from '@/lib/env';

export interface MatchHandlers {
  score?: (p: ScoreUpdatedPayload) => void;
  status?: (p: MatchStatusPayload) => void;
  scorer?: (p: ScorerChangedPayload) => void;
}

/**
 * One shared socket for the whole tab. Components subscribe per match; the room is joined once per
 * match (reference counted), re-joined after every reconnect, and the socket closes when nobody watches.
 */
const watchers = new Map<string, Set<MatchHandlers>>();
const connectionListeners = new Set<() => void>();
let socket: Socket | null = null;

const notify = () => connectionListeners.forEach((fn) => fn());

function ensureSocket(): Socket {
  if (socket) return socket;
  const s = io(`${env.apiUrl}${LIVE_NAMESPACE}`, { transports: ['websocket'], reconnectionDelayMax: 30_000 });
  s.on('connect', () => {
    // rooms are lost on disconnect: join them all again
    for (const matchId of watchers.keys()) s.emit(LIVE_EVENTS.client.joinMatch, { matchId });
    notify();
  });
  s.on('disconnect', notify);
  s.on(LIVE_EVENTS.server.scoreUpdated, (p: ScoreUpdatedPayload) => watchers.get(p.matchId)?.forEach((h) => h.score?.(p)));
  s.on(LIVE_EVENTS.server.matchStatus, (p: MatchStatusPayload) => watchers.get(p.matchId)?.forEach((h) => h.status?.(p)));
  s.on(LIVE_EVENTS.server.scorerChanged, (p: ScorerChangedPayload) => watchers.get(p.matchId)?.forEach((h) => h.scorer?.(p)));
  socket = s;
  return s;
}

/** Watch one match. Returns the unsubscribe function. No-op when sockets are turned off. */
export function watchMatch(matchId: string, handlers: MatchHandlers): () => void {
  if (!env.socketEnabled) return () => undefined;
  const s = ensureSocket();
  let set = watchers.get(matchId);
  if (!set) {
    set = new Set();
    watchers.set(matchId, set);
    if (s.connected) s.emit(LIVE_EVENTS.client.joinMatch, { matchId });
  }
  set.add(handlers);

  return () => {
    const current = watchers.get(matchId);
    if (!current) return;
    current.delete(handlers);
    if (current.size > 0) return;
    watchers.delete(matchId);
    if (s.connected) s.emit(LIVE_EVENTS.client.leaveMatch, { matchId });
    if (watchers.size === 0) {
      s.disconnect();
      socket = null;
      notify();
    }
  };
}

// for useSyncExternalStore
export const subscribeConnection = (fn: () => void): (() => void) => {
  connectionListeners.add(fn);
  return () => connectionListeners.delete(fn);
};
export const getConnected = (): boolean => socket?.connected ?? false;
