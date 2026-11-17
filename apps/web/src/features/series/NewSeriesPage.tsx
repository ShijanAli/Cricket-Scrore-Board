import { useState } from 'react';
import { defaultMaxOversPerBowler } from '@cricket/engine';
import { createSeriesSchema } from '@cricket/shared';
import { useNavigate } from 'react-router-dom';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { NumberStepper } from '@/components/common/NumberStepper';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetTeamsQuery } from '@/features/teams/teamsApi';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useCreateSeriesMutation } from './seriesApi';

export function NewSeriesPage() {
  const navigate = useNavigate();
  const teams = useGetTeamsQuery();
  const [createSeries, { isLoading, error }] = useCreateSeriesMutation();
  const [name, setName] = useState('');
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [count, setCount] = useState(3);
  const [overs, setOvers] = useState(10);
  const [players, setPlayers] = useState(11);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = createSeriesSchema.safeParse({
      name,
      teamAId: a ?? '',
      teamBId: b ?? '',
      matchCount: count,
      rules: { oversPerInnings: overs, playersPerSide: players, maxOversPerBowler: defaultMaxOversPerBowler(overs) },
    });
    if (!r.success) return setFormError(r.error.issues[0]?.message ?? 'Check the form');
    setFormError(null);
    const res = await createSeries(r.data);
    if (!res.error) navigate(paths.app.series(res.data.id), { replace: true });
  };

  return (
    <>
      <PageHeader title="New series" backTo={paths.app.events} />
      <QueryBoundary
        query={teams}
        isEmpty={(d) => d.length < 2}
        empty={<EmptyState title="Create two teams first" hint="A series is played between two of your teams." />}
      >
        {(list) => (
          <Card className="max-w-xl">
            <CardContent>
              <form className="space-y-5" noValidate onSubmit={(e) => void submit(e)}>
                <div className="space-y-1.5">
                  <Label htmlFor="s-name">Series name</Label>
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Team A</Label>
                  <ChoiceGroup label="Team A" options={list.filter((t) => t.id !== b).map((t) => ({ value: t.id, label: t.name }))} value={a} onChange={setA} />
                </div>
                <div className="space-y-2">
                  <Label>Team B</Label>
                  <ChoiceGroup label="Team B" options={list.filter((t) => t.id !== a).map((t) => ({ value: t.id, label: t.name }))} value={b} onChange={setB} />
                </div>
                <div className="space-y-2">
                  <Label>Number of matches</Label>
                  <ChoiceGroup label="Number of matches" options={[1, 3, 5, 7, 9].map((n) => ({ value: n, label: String(n) }))} value={count} onChange={setCount} />
                </div>
                <NumberStepper label="Overs per innings" value={overs} min={1} max={50} onChange={setOvers} />
                <NumberStepper label="Players per side" value={players} min={2} max={15} onChange={setPlayers} />
                {formError ? <ErrorState message={formError} /> : null}
                {error ? <ErrorState message={errorMessage(error)} /> : null}
                <Button type="submit" size="lg" disabled={isLoading}>
                  {isLoading ? 'Creating…' : 'Create series'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
