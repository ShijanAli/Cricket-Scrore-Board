import { useEffect, useState, useSyncExternalStore } from 'react';
import { isFinished } from '@cricket/client-core';
import { useAppDispatch } from '@/app/hooks';
import { baseApi } from '@/app/api/baseApi';
import { matchesApi, useGetMatchQuery } from '@/features/matches/matchesApi';
import { getConnected, subscribeConnection, watchMatch } from './socketClient';

/** true while the WebSocket to the API is open. */
export const useSocketConnected = (): boolean => useSyncExternalStore(subscribeConnection, getConnected);

const POLL_MS = 10_000;

/**
 * A match that stays fresh by itself. Real-time pushes are written straight into the RTK Query
 * cache, so every component reading the match updates with no extra state. When the socket is not
 * connected (server without WebSocket, or a dropped connection) the match is polled instead.
 */
export function useWatchedMatch(matchId: string) {
  const dispatch = useAppDispatch();
  const connected = useSocketConnected();
  const [finished, setFinished] = useState(false);
  const query = useGetMatchQuery(matchId, {
    pollingInterval: connected || finished ? 0 : POLL_MS,
    skipPollingIfUnfocused: true,
  });

  const status = query.data?.status;
  useEffect(() => setFinished(status ? isFinished(status) : false), [status]);

  useEffect(() => {
    if (finished) return;
    return watchMatch(matchId, {
      score: (p) => {
        let found = false;
        dispatch(
          matchesApi.util.updateQueryData('getMatch', matchId, (draft) => {
            const row = draft.innings.find((i) => i.inningsNo === p.inningsNo);
            if (!row) return;
            found = true;
            row.snapshot = p.innings;
            row.lastSeq = p.lastSeq;
          }),
        );
        // an innings we have not loaded yet (it just started): fetch the match again
        if (!found) dispatch(baseApi.util.invalidateTags([{ type: 'Match', id: matchId }]));
      },
      status: (p) => {
        dispatch(
          matchesApi.util.updateQueryData('getMatch', matchId, (draft) => {
            draft.status = p.status;
          }),
        );
        dispatch(baseApi.util.invalidateTags([{ type: 'Match', id: matchId }, 'Live']));
      },
    });
  }, [matchId, finished, dispatch]);

  return { query, connected };
}
