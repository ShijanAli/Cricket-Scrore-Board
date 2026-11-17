import { Stack, useLocalSearchParams } from 'expo-router';
import { ScoringView } from '@/features/scoring/ScoringView';
import { useMatch } from '@/hooks/queries';
import { EmptyState, Loading, QueryBoundary, Screen } from '@/ui';

export default function ScoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <>
      <Stack.Screen options={{ title: 'Scoring' }} />
      <QueryBoundary query={match}>
        {(m) => {
          const current = m.innings.find((i) => i.inningsNo === m.currentInningsNo);
          if (!current) {
            return (
              <Screen>
                <EmptyState title="Innings not started" hint="Start the innings from the match page." />
              </Screen>
            );
          }
          if (m.canScore === false) {
            return (
              <Screen>
                <EmptyState title="View only" hint="Only the match scorer can score." />
              </Screen>
            );
          }
          // key = fresh controller per innings
          return <ScoringView key={`${m.id}:${current.inningsNo}`} match={m} inningsNo={current.inningsNo} />;
        }}
      </QueryBoundary>
    </>
  );
}
