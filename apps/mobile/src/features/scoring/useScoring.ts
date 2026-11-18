import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, ScoringController, type ScoringSnapshot, type MatchDetail } from '@cricket/client-core';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { SqliteEventStore } from './sqlite-store';

export type LockState = 'pending' | 'held' | 'denied';

const FLUSH_EVERY_MS = 8_000;
const LOCK_RENEW_MS = 60_000; // server TTL is 120s

export interface UseScoring {
  controller: ScoringController;
  snapshot: ScoringSnapshot;
  lock: LockState;
}

/**
 * Everything the scoring screen needs: the offline controller, the scorer lock, and the
 * triggers that push balls to the server (after every tap, on an interval, on app resume).
 */
export function useScoring(match: MatchDetail, inningsNo: number): UseScoring {
  const db = useSQLiteContext();
  const qc = useQueryClient();
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
      store: new SqliteEventStore(db),
      api: api.matches,
    });
    // The setup, rules and target of an innings never change once it has started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, inningsNo, db]);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  // load the phone's log, then the server's
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
        // Only a real "someone else is scoring" blocks us. Offline scoring must keep working.
        setLock(e instanceof ApiError && !e.isNetwork && e.status === 409 ? 'denied' : 'held');
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
    const t = setInterval(() => void controller.flush(), FLUSH_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void controller.flush();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [controller]);

  // refresh the match (status, result) once everything is confirmed by the server
  const hadPending = useRef(false);
  useEffect(() => {
    if (snapshot.pending > 0) hadPending.current = true;
    else if (hadPending.current && !snapshot.syncing) {
      hadPending.current = false;
      void qc.invalidateQueries({ queryKey: keys.match(match.id) });
      void qc.invalidateQueries({ queryKey: keys.matches });
      // a finished match changes standings, fixtures (playoff slots) and series scores
      void qc.invalidateQueries({ queryKey: keys.tournaments });
      void qc.invalidateQueries({ queryKey: keys.seriesList });
    }
  }, [snapshot.pending, snapshot.syncing, match.id, qc]);

  return { controller, snapshot, lock };
}
