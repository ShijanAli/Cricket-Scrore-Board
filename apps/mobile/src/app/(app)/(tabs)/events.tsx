import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSeriesList, useTournaments } from '@/hooks/queries';
import { Badge, Button, Card, EmptyState, QueryBoundary, Segmented, Text, colors, space } from '@/ui';

export default function EventsTab() {
  const router = useRouter();
  const [mode, setMode] = useState<'tournaments' | 'series'>('tournaments');
  const tournaments = useTournaments();
  const series = useSeriesList();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={[]}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Segmented options={[{ value: 'tournaments', label: 'Tournaments' }, { value: 'series', label: 'Series' }] as const} value={mode} onChange={setMode} />
        {mode === 'tournaments' ? (
          <>
            <Button title="+ New tournament" onPress={() => router.push('/tournament/new')} />
            <QueryBoundary query={tournaments} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No tournaments yet" hint="League, knockout or league + semi-finals, with automatic fixtures." />}>
              {(list) =>
                list.map((t) => (
                  <Card key={t.id} onPress={() => router.push(`/tournament/${t.id}`)} style={{ gap: 4 }}>
                    <Text variant="label">{t.name}</Text>
                    <Text variant="muted">{t._count.teams}/{t.teamCount} teams · {t._count.matches} matches</Text>
                    <Badge label={t.status === 'draft' ? 'Setting up' : t.status === 'live' ? 'In progress' : 'Completed'} tone={t.status === 'live' ? 'live' : t.status === 'completed' ? 'success' : 'neutral'} />
                  </Card>
                ))
              }
            </QueryBoundary>
          </>
        ) : (
          <>
            <Button title="+ New series" onPress={() => router.push('/series/new')} />
            <QueryBoundary query={series} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No series yet" hint="Best-of-3, 5 or 7 between two teams." />}>
              {(list) =>
                list.map((s) => (
                  <Card key={s.id} onPress={() => router.push(`/series/${s.id}`)} style={{ gap: 4 }}>
                    <Text variant="label">{s.name}</Text>
                    <Text variant="muted">{s.teamA.name} vs {s.teamB.name} · best of {s.matchCount}</Text>
                    <Badge label={s.status === 'live' ? 'In progress' : 'Completed'} tone={s.status === 'live' ? 'live' : 'success'} />
                  </Card>
                ))
              }
            </QueryBoundary>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
