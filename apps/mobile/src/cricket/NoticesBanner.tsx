import { View } from 'react-native';
import { NOTICE_LABEL, activeNotices, pauseNotice, type TournamentNotice } from '@cricket/client-core';
import { useTournamentNotices } from '@/hooks/queries';
import { Card, Text, colors, space } from '@/ui';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function NoticeItem({ n, dim }: { n: TournamentNotice; dim?: boolean }) {
  return (
    <Card style={{ gap: 2, opacity: dim ? 0.6 : 1 }}>
      <Text variant="muted">
        {NOTICE_LABEL[n.kind].toUpperCase()} · {when(n.createdAt)}
      </Text>
      <Text variant="label">{n.title}</Text>
      {n.message ? <Text variant="body">{n.message}</Text> : null}
    </Card>
  );
}

/** Pause banner first, then other active notices. Renders nothing when there is nothing to announce. */
export function NoticesBanner({ id }: { id: string }) {
  const q = useTournamentNotices(id, true);
  const all = q.data ?? [];
  const pause = pauseNotice(all);
  const others = activeNotices(all).filter((n) => n.id !== pause?.id);
  if (!pause && others.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      {pause ? (
        <Card style={{ backgroundColor: colors.warningSoft, gap: 2 }}>
          <Text variant="muted" style={{ color: colors.warning, fontWeight: '700' }}>
            TOURNAMENT PAUSED
          </Text>
          <Text variant="title">{pause.title}</Text>
          {pause.message ? <Text variant="body">{pause.message}</Text> : null}
          <Text variant="muted">Since {when(pause.createdAt)}. Scoring is on hold until the organiser resumes play.</Text>
        </Card>
      ) : null}
      {others.map((n) => (
        <NoticeItem key={n.id} n={n} />
      ))}
    </View>
  );
}
