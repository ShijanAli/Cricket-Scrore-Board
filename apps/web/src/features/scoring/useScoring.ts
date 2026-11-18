import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScoringController, type MatchDetail, type ScoringSnapshot } from '@cricket/client-core';
import { api } from '@/app/api/client';
import { baseApi } from '@/app/api/baseApi';
import { useAppDispatch } from '@/app/hooks';
import type { LockState } from '@/components/cricket/SyncBanner';
import { isNetworkError } from '@/lib/errors';
import { toFailure } from '@/app/api/baseApi';
import { getEventStore } from './idb-store';

const FLUSH_EVERY_MS = 8_000;
const LOCK_RENEW_MS = 60_000; // server TTL is 120s

export interface UseScoring {
  controller: ScoringController;
  snapshot: ScoringSnapshot;
  lock: LockState;
}

/**
 * Everything the scoring screen needs: the offline controller, the scorer lock, and the triggers
 * that push balls to the server (after every tap, on an interval, when the browser comes back
 * online, and when the tab becomes visible again).
 */
export function useScoring(match: MatchDetail, inningsNo: number): UseScoring {
  const dispatch = useAppDispatch();
  const [lock, setLock] = useState<LockState>('pending');

  const controller = useMemo(() => {
    const row = match.innings.find((i) => i.inningsNo === inningsNo);
    if (!row) throw new Error(`Innings ${inningsNo} has not started`);
    return new ScoringController({
      matchId: match.id,
      inningsNo,
      setup: {
        battingTeamId: row.battingTeamId,
        bowlingTeamId: row.bowlingTeamId,
        strikerId: row.strikerId,
        nonStrikerId: row.nonStrikerId,
        bowlerId: row.bowlerId,
      },
      rules: match.rules,
      target: row.target,
      store: getEventStore(),
      api: api.matches,
    });
    // The setup, rules and target of an innings never change once it has started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, inningsNo]);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  // load the browser's log, then the server's
  useEffect(() => {
    void controller.init();
  }, [controller]);

  // scorer lock: take it, keep it fresh, give it back
  useEffect(() => {
    let alive = true;
    const take = async () => {
      try {
        await api.matches.lockScorer(match.id);
        if (alive) setLock('held');
        controller.clearLocked();
      } catch (e) {
        if (!alive) return;
        const failure = toFailure(e);
        // Only a real "someone else is scoring" blocks us. Offline scoring must keep working.
        setLock(!isNetworkError(failure) && failure.status === 409 ? 'denied' : 'held');
      }
    };
    void take();
    const t = setInterval(() => void take(), LOCK_RENEW_MS);
    return () => {
      alive = false;
      clearInterval(t);
      void api.matches.releaseScorer(match.id).catch(() => undefined);
    };
  }, [match.id, controller]);

  // background sync triggers
  useEffect(() => {
    const flush = () => void controller.flush();
    const onVisible = () => document.visibilityState === 'visible' && flush();
    const t = setInterval(flush, FLUSH_EVERY_MS);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [controller]);

  // warn before closing the tab while balls are not on the server yet
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (controller.getSnapshot().pending > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [controller]);

  // refresh match, fixtures, tables and series once everything is confirmed by the server
  const hadPending = useRef(false);
  useEffect(() => {
    if (snapshot.pending > 0) hadPending.current = true;
    else if (hadPending.current && !snapshot.syncing) {
      hadPending.current = false;
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'Match', id: match.id },
          'Matches',
          'Live',
          // a finished match changes standings, fixtures (playoff slots) and series scores
          'Tournaments',
          'Fixtures',
          'Standings',
          'SeriesList',
          'Series',
        ]),
      );
    }
  }, [snapshot.pending, snapshot.syncing, match.id, dispatch]);

  return { controller, snapshot, lock };
}
