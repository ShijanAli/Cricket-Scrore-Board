import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTeams } from '@/hooks/queries';
import { Button, Card, EmptyState, QueryBoundary, TeamBadge, Text, colors, space } from '@/ui';

export default function TeamsTab() {
  const router = useRouter();
  const teams = useTeams();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={[]}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Button title="+ New team" onPress={() => router.push('/team/new')} />
        <QueryBoundary
          query={teams}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState title="No teams yet" hint="Add your team and its players." />}
        >
          {(list) =>
            list.map((t) => (
              <Card key={t.id} onPress={() => router.push(`/team/${t.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <TeamBadge shortName={t.shortName} color={t.color} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{t.name}</Text>
                    <Text variant="muted">{t._count.roster} players</Text>
                  </View>
                </View>
              </Card>
            ))
          }
        </QueryBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
