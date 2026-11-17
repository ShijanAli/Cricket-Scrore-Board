import { Stack, useLocalSearchParams } from 'expo-router';
import { Scorecard } from '@/cricket/Scorecard';
import { playerNames, teamName } from '@/cricket/match-utils';
import { useMatch } from '@/hooks/queries';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { QueryBoundary, Screen, Text } from '@/ui';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  const live = useLiveMatch(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Scorecard' }} />
      <QueryBoundary query={match}>
        {(m) => {
          const nameOf = playerNames(m.players);
          const rows = [...m.innings].sort((a, b) => a.inningsNo - b.inningsNo);
          return (
            <>
              {m.resultText ? <Text variant="title">{m.resultText}</Text> : null}
              {rows.map((r) => {
                const state = live.innings[r.inningsNo] ?? r.snapshot;
                return state ? <Scorecard key={r.id} title={`${teamName(m, r.battingTeamId)} (innings ${r.inningsNo})`} state={state} nameOf={nameOf} /> : null;
              })}
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
