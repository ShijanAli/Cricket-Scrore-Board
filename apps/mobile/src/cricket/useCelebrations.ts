import { useEffect, useMemo, useRef } from 'react';
import { CelebrationTracker, celebrationView, playerNames, teamName, type MatchDetail } from '@cricket/client-core';
import type { InningsState } from '@cricket/shared';
import { useCelebrationStore } from '@/state/celebrations';

type Source = ReadonlyArray<{ inningsNo: number; snapshot: InningsState | null }>;

/**
 * Feed a match's innings snapshots in and get celebrations (4s, 6s, wickets, 50/100... totals and
 * personal milestones) on the global overlay. The scorer passes its local state so it fires instantly.
 */
export function useCelebrations(match: MatchDetail, source: Source): void {
  const tracker = useMemo(() => new CelebrationTracker(), [match.id]);
  const matchRef = useRef(match);
  matchRef.current = match;

  useEffect(() => {
    const m = matchRef.current;
    const found = tracker.feed(source);
    if (found.length === 0) return;
    const nameOf = playerNames(m.players);
    useCelebrationStore.getState().push(
      found.map((c) => ({
        key: c.key,
        view: celebrationView(c, { playerName: (id) => (id ? nameOf(id) : 'Player'), teamName: (id) => teamName(m, id) }),
      })),
    );
  }, [source, tracker]);

  useEffect(() => () => useCelebrationStore.getState().clear(), []);
}
