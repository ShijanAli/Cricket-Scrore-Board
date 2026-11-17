import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { MatchDetail } from '@/api/types';
import { inningsSides, teamName, xiOf } from '@/cricket/match-utils';
import { useMatch, useStartInnings } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, Chip, ErrorBanner, QueryBoundary, Screen, Text } from '@/ui';
import { View } from 'react-native';

function Setup({ match }: { match: MatchDetail }) {
  const router = useRouter();
  const start = useStartInnings(match.id);
  const inningsNo = match.currentInningsNo + 1;
  const sides = inningsSides(match, inningsNo);
  const [striker, setStriker] = useState<string | null>(null);
  const [nonStriker, setNonStriker] = useState<string | null>(null);
  const [bowler, setBowler] = useState<string | null>(null);
  if (!sides) return <Text variant="muted">Record the toss first.</Text>;

  const batters = xiOf(match, sides.batting);
  const bowlers = xiOf(match, sides.bowling);
  const ready = !!striker && !!nonStriker && !!bowler;
  const group = (title: string, list: typeof batters, value: string | null, set: (v: string) => void, disabledId?: string | null) => (
    <>
      <Text variant="title">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map((p) => (
          <Chip key={p.playerId} label={p.player.name} selected={value === p.playerId} disabled={p.playerId === disabledId} onPress={() => set(p.playerId)} />
        ))}
      </View>
    </>
  );

  return (
    <>
      <Text variant="muted">
        Innings {inningsNo}: {teamName(match, sides.batting)} bat, {teamName(match, sides.bowling)} bowl
      </Text>
      {group('Striker', batters, striker, setStriker, nonStriker)}
      {group('Non-striker', batters, nonStriker, setNonStriker, striker)}
      {group('Opening bowler', bowlers, bowler, setBowler)}
      {start.isError ? <ErrorBanner message={errorMessage(start.error)} /> : null}
      <Button
        title="Start innings"
        disabled={!ready}
        loading={start.isPending}
        onPress={() =>
          ready &&
          start.mutate(
            { battingTeamId: sides.batting, bowlingTeamId: sides.bowling, strikerId: striker!, nonStrikerId: nonStriker!, bowlerId: bowler! },
            { onSuccess: () => router.replace(`/match/${match.id}/score`) },
          )
        }
      />
    </>
  );
}

export default function StartInningsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Start innings' }} />
      <QueryBoundary query={match}>{(m) => <Setup match={m} />}</QueryBoundary>
    </Screen>
  );
}
