import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { SeriesDetail } from '@cricket/client-core';
import { FixtureRow } from '@/cricket/FixtureRow';
import { AwardsCard } from '@/cricket/AwardsCard';
import { useSeries, useSeriesAwards } from '@/hooks/queries';
import { Badge, Card, QueryBoundary, Screen, Text, space } from '@/ui';

function Detail({ s }: { s: SeriesDetail }) {
  const router = useRouter();
  const awards = useSeriesAwards(s.id);
  const winner = s.score.winnerTeamId === s.teamAId ? s.teamA : s.score.winnerTeamId === s.teamBId ? s.teamB : null;
  return (
    <>
      <Stack.Screen options={{ title: s.name }} />
      <Card style={{ gap: space.sm, alignItems: 'center' }}>
        <Text variant="muted">
          Best of {s.matchCount} · first to {s.score.needed}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Text variant="label">{s.teamA.name}</Text>
          <Text variant="heading">
            {s.score.winsA} - {s.score.winsB}
          </Text>
          <Text variant="label">{s.teamB.name}</Text>
        </View>
        {winner ? <Badge tone="success" label={`${winner.name} won the series`} /> : <Badge tone="live" label="In progress" />}
      </Card>
      <AwardsCard awards={awards.data} />
      <Text variant="title">Matches</Text>
      {s.matches.map((m) => (
        <FixtureRow key={m.id} match={{ ...m, teamA: s.teamA, teamB: s.teamB }} onPress={() => router.push(`/match/${m.id}`)} />
      ))}
    </>
  );
}

export default function SeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const series = useSeries(id);
  return (
    <Screen>
      <QueryBoundary query={series}>{(s) => <Detail s={s} />}</QueryBoundary>
    </Screen>
  );
}
