import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { defaultMaxOversPerBowler } from '@cricket/engine';
import { createSeriesSchema } from '@cricket/shared';
import { useCreateSeries, useTeams } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, EmptyState, ErrorBanner, NumberStepper, QueryBoundary, Screen, Segmented, Text, TextField } from '@/ui';

export default function NewSeries() {
  const router = useRouter();
  const teams = useTeams();
  const create = useCreateSeries();
  const [name, setName] = useState('');
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [count, setCount] = useState(3);
  const [overs, setOvers] = useState(10);
  const [players, setPlayers] = useState(11);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const r = createSeriesSchema.safeParse({
      name,
      teamAId: a ?? '',
      teamBId: b ?? '',
      matchCount: count,
      rules: { oversPerInnings: overs, playersPerSide: players, maxOversPerBowler: defaultMaxOversPerBowler(overs) },
    });
    if (!r.success) return setError(r.error.issues[0]?.message ?? 'Check the form');
    setError(null);
    create.mutate(r.data, { onSuccess: (s) => router.replace(`/series/${s.id}`) });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New series' }} />
      <QueryBoundary query={teams} isEmpty={(d) => d.length < 2} empty={<EmptyState title="Create two teams first" hint="A series is played between two of your teams." />}>
        {(list) => (
          <>
            <TextField label="Series name" value={name} onChangeText={setName} />
            <Text variant="label">Team A</Text>
            <Segmented options={list.filter((t) => t.id !== b).map((t) => ({ value: t.id, label: t.name }))} value={a ?? ''} onChange={setA} />
            <Text variant="label">Team B</Text>
            <Segmented options={list.filter((t) => t.id !== a).map((t) => ({ value: t.id, label: t.name }))} value={b ?? ''} onChange={setB} />
            <Text variant="label">Number of matches</Text>
            <Segmented options={[1, 3, 5, 7, 9].map((n) => ({ value: n, label: String(n) }))} value={count} onChange={setCount} />
            <NumberStepper label="Overs per innings" value={overs} min={1} max={50} onChange={setOvers} />
            <NumberStepper label="Players per side" value={players} min={2} max={15} onChange={setPlayers} />
            {error ? <ErrorBanner message={error} /> : null}
            {create.isError ? <ErrorBanner message={errorMessage(create.error)} /> : null}
            <Button title="Create series" loading={create.isPending} onPress={submit} />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
