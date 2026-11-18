import { useEffect, useMemo, useRef, useState } from 'react';
import { CelebrationTracker, celebrationView, playerNames, teamName, type CelebrationView, type MatchDetail } from '@cricket/client-core';
import type { InningsState } from '@cricket/shared';
import { cn } from '@/lib/utils';

interface Props {
  match: MatchDetail;
  /** Defaults to the match's own innings. The scorer passes its local state so it celebrates instantly. */
  innings?: ReadonlyArray<{ inningsNo: number; snapshot: InningsState | null }>;
}

const TONES: Record<CelebrationView['tone'], string> = {
  gold: 'from-amber-400 to-orange-500 text-amber-950',
  red: 'from-red-500 to-rose-700 text-white',
  green: 'from-emerald-400 to-green-600 text-emerald-950',
  blue: 'from-sky-400 to-blue-600 text-white',
};
const CONFETTI = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#eab308'];
const MAX_QUEUE = 3;

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 30,
        delay: Math.random() * 0.8,
        dur: 2 + Math.random() * 1.6,
        color: CONFETTI[i % CONFETTI.length],
        w: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.w * 1.6,
              background: p.color,
              '--dx': `${p.dx}vw`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Full-screen celebration for fours, sixes, wickets, 50/100/150... team totals and personal milestones.
 * Never blocks touches (pointer-events-none), so the scorer can keep scoring through it.
 */
export function CelebrationOverlay({ match, innings }: Props) {
  const tracker = useMemo(() => new CelebrationTracker(), [match.id]);
  const [queue, setQueue] = useState<{ key: string; view: CelebrationView }[]>([]);
  const lookup = useRef({ match });
  lookup.current = { match };

  const source = innings ?? match.innings;
  useEffect(() => {
    const m = lookup.current.match;
    const nameOf = playerNames(m.players);
    const found = tracker.feed(source.map((i) => ({ inningsNo: i.inningsNo, snapshot: i.snapshot })));
    if (found.length === 0) return;
    const views = found.map((c) => ({
      key: c.key,
      view: celebrationView(c, { playerName: (id) => (id ? nameOf(id) : 'Player'), teamName: (id) => teamName(m, id) }),
    }));
    setQueue((q) => [...q, ...views].slice(-MAX_QUEUE));
  }, [source, tracker]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), current.view.durationMs);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  const { view } = current;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {view.confetti ? <Confetti key={current.key} /> : null}
      <div
        key={current.key}
        className={cn('animate-celebrate-pop rounded-3xl bg-gradient-to-br px-10 py-6 text-center shadow-2xl ring-4 ring-white/70', TONES[view.tone])}
      >
        <div className="text-5xl leading-none">{view.emoji}</div>
        <div className="mt-2 text-4xl font-black tracking-wide sm:text-5xl">{view.title}</div>
        <div className="mt-1 text-base font-semibold opacity-90">{view.subtitle}</div>
      </div>
    </div>
  );
}
