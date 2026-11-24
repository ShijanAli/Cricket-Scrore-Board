import { NOTICE_LABEL, pauseNotice, activeNotices, type TournamentNotice } from '@cricket/client-core';
import { useGetTournamentNoticesQuery } from '@/features/tournaments/tournamentsApi';
import { cn } from '@/lib/utils';

const ago = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function NoticeItem({ n, className }: { n: TournamentNotice; className?: string }) {
  return (
    <div className={cn('rounded-lg border p-3 text-sm', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">
          <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{NOTICE_LABEL[n.kind]}</span>
          {n.title}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">{ago(n.createdAt)}</span>
      </div>
      {n.message ? <p className="mt-1 text-muted-foreground">{n.message}</p> : null}
    </div>
  );
}

/**
 * Public announcements. While the organiser has paused play a big banner leads; other active notices
 * (delay, weather, dispute...) follow. Renders nothing when there is nothing to say.
 */
export function NoticesBanner({ id, poll = false }: { id: string; poll?: boolean }) {
  const q = useGetTournamentNoticesQuery(id, poll ? { pollingInterval: 20_000, skipPollingIfUnfocused: true } : undefined);
  const all = q.data ?? [];
  const pause = pauseNotice(all);
  const others = activeNotices(all).filter((n) => n.id !== pause?.id);
  if (!pause && others.length === 0) return null;
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {pause ? (
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning">Tournament paused</p>
          <p className="mt-1 text-lg font-semibold">{pause.title}</p>
          {pause.message ? <p className="mt-1 text-sm text-muted-foreground">{pause.message}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">Since {ago(pause.createdAt)}. Scoring is on hold until the organiser resumes play.</p>
        </div>
      ) : null}
      {others.map((n) => (
        <NoticeItem key={n.id} n={n} className="border-sky-300 bg-gradient-to-r from-sky-50 to-indigo-50" />
      ))}
    </div>
  );
}

/** Full history, newest first. */
export function NoticesHistory({ id }: { id: string }) {
  const q = useGetTournamentNoticesQuery(id);
  const all = q.data ?? [];
  if (all.length === 0) return <p className="text-sm text-muted-foreground">No announcements yet.</p>;
  return (
    <div className="space-y-2">
      {all.map((n) => (
        <NoticeItem key={n.id} n={n} className={n.active ? '' : 'opacity-70'} />
      ))}
    </div>
  );
}
