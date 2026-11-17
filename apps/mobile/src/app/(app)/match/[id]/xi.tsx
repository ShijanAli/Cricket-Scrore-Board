import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import type { MatchDetail } from '@/api/types';
import { XiPicker } from '@/cricket/XiPicker';
import { xiOf } from '@/cricket/match-utils';
import { useMatch, useSetPlayingXI } from '@/hooks/queries';
import { api } from '@/lib/api';
import { errorMessage, keys } from '@/lib/query';
import { Button, ErrorBanner, Loading, QueryBoundary, Screen } from '@/ui';

function XiForm({ match }: { match: MatchDetail }) {
  const router = useRouter();
  const save = useSetPlayingXI(match.id);
  const teamIds = [match.teamAId, match.teamBId].filter((x): x is string => !!x);
  const squads = useQueries({ queries: teamIds.map((id) => ({ queryKey: keys.team(id), queryFn: () => api.teams.get(id) })) });
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(teamIds.map((t) => [t, xiOf(match, t).map((p) => p.playerId)])),
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [picked]);

  if (squads.some((q) => q.data === undefined)) return <Loading />;
  const max = match.rules.playersPerSide;
  const ready = teamIds.every((t) => (picked[t]?.length ?? 0) >= 2);

  const submit = async () => {
    try {
      for (const teamId of teamIds) await save.mutateAsync({ teamId, playerIds: picked[teamId] ?? [] });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      {squads.map((q) => {
        const team = q.data!;
        return (
          <XiPicker
            key={team.id}
            team={team}
            squad={team.roster}
            selected={picked[team.id] ?? []}
            max={max}
            onChange={(ids) => setPicked((p) => ({ ...p, [team.id]: ids }))}
            onManageSquad={() => router.push(`/team/${team.id}`)}
          />
        );
      })}
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Save playing XIs" disabled={!ready} loading={save.isPending} onPress={() => void submit()} />
    </>
  );
}

export default function XiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Playing XI' }} />
      <QueryBoundary query={match}>{(m) => <XiForm match={m} />}</QueryBoundary>
    </Screen>
  );
}
