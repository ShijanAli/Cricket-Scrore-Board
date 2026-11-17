import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MatchCard } from '@/cricket/MatchCard';
import { useLiveMatches, useMatches } from '@/hooks/queries';
import { Button, EmptyState, QueryBoundary, Text, colors, space } from '@/ui';

export default function MatchesTab() {
  const router = useRouter();
  const mine = useMatches();
  const live = useLiveMatches();
  const open = (id: string) => router.push(`/match/${id}`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={[]}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => { void mine.refetch(); void live.refetch(); }} />}
      >
        <Button title="+ New match" onPress={() => router.push('/match/new')} />

        {live.data && live.data.length > 0 ? (
          <>
            <Text variant="title">Live now</Text>
            {live.data.map((m) => <MatchCard key={m.id} match={m} onPress={() => open(m.id)} />)}
          </>
        ) : null}

        <Text variant="title">My matches</Text>
        <QueryBoundary
          query={mine}
          isEmpty={(d) => d.items.length === 0}
          empty={<EmptyState title="No matches yet" hint="Create a match, pick the teams and start scoring." action={{ label: 'New match', onPress: () => router.push('/match/new') }} />}
        >
          {(d) => d.items.map((m) => <MatchCard key={m.id} match={m} onPress={() => open(m.id)} />)}
        </QueryBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
