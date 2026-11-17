import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { TossDecision } from '@cricket/shared';
import { teamName, type MatchDetail } from '@cricket/client-core';
import { useMatch, useToss } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, ErrorBanner, QueryBoundary, Screen, Segmented, Text } from '@/ui';

function TossForm({ match }: { match: MatchDetail }) {
  const router = useRouter();
  const toss = useToss(match.id);
  const [winner, setWinner] = useState<string | null>(match.tossWinnerId);
  const [decision, setDecision] = useState<TossDecision>(match.tossDecision ?? 'bat');
  const teams = [match.teamAId, match.teamBId].filter((x): x is string => !!x);

  return (
    <>
      <Text variant="title">Who won the toss?</Text>
      <Segmented options={teams.map((t) => ({ value: t, label: teamName(match, t) }))} value={winner ?? ''} onChange={setWinner} />
      <Text variant="title">Elected to</Text>
      <Segmented options={[{ value: 'bat', label: 'Bat' }, { value: 'bowl', label: 'Bowl' }] as const} value={decision} onChange={setDecision} />
      {toss.isError ? <ErrorBanner message={errorMessage(toss.error)} /> : null}
      <Button
        title="Save toss"
        disabled={!winner}
        loading={toss.isPending}
        onPress={() => winner && toss.mutate({ winnerTeamId: winner, decision }, { onSuccess: () => router.back() })}
      />
    </>
  );
}

export default function TossScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Toss' }} />
      <QueryBoundary query={match}>{(m) => <TossForm match={m} />}</QueryBoundary>
    </Screen>
  );
}
