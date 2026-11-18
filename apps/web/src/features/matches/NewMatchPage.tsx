import { zodResolver } from '@hookform/resolvers/zod';
import { defaultMaxOversPerBowler } from '@cricket/engine';
import { createSingleMatchSchema, type CreateSingleMatchInput } from '@cricket/shared';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { ChoiceButton } from '@/components/common/ChoiceGroup';
import { ErrorState } from '@/components/common/ErrorState';
import { FormField } from '@/components/common/FormField';
import { NumberStepper } from '@/components/common/NumberStepper';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGetTeamsQuery } from '@/features/teams/teamsApi';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useCreateMatchMutation } from './matchesApi';

type FormValues = z.input<typeof createSingleMatchSchema>;

export function NewMatchPage() {
  const navigate = useNavigate();
  const [createMatch, { isLoading, error }] = useCreateMatchMutation();
  const teams = useGetTeamsQuery();
  const { control, handleSubmit, setValue, watch } = useForm<FormValues, unknown, CreateSingleMatchInput>({
    resolver: zodResolver(createSingleMatchSchema),
    defaultValues: {
      teamAName: '',
      teamBName: '',
      ground: '',
      rules: {
        oversPerInnings: 10, ballsPerOver: 6, playersPerSide: 11, wideRuns: 1, noBallRuns: 1,
        freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastManStands: false,
        maxOversPerBowler: defaultMaxOversPerBowler(10),
      },
    },
  });
  const a = watch('teamAName');
  const b = watch('teamBName');

  const submit = handleSubmit(async (v) => {
    const res = await createMatch(v);
    if (!res.error) navigate(paths.app.match(res.data.id), { replace: true });
  });

  return (
    <>
      <PageHeader title="New match" backTo={paths.app.matches} />
      <Card className="max-w-xl">
        <CardContent>
          <form className="space-y-5" noValidate onSubmit={(e) => void submit(e)}>
            <FormField control={control} name="teamAName" label="Team A" />
            <FormField control={control} name="teamBName" label="Team B" />
            {teams.data && teams.data.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or pick one of your teams</p>
                <div className="flex flex-wrap gap-2">
                  {teams.data.map((t) => (
                    <ChoiceButton
                      key={t.id}
                      role="checkbox"
                      selected={t.name === a || t.name === b}
                      onClick={() => setValue(a === '' || (a !== t.name && b !== '') ? 'teamAName' : 'teamBName', t.name, { shouldValidate: true })}
                    >
                      {t.name}
                    </ChoiceButton>
                  ))}
                </div>
              </div>
            ) : null}

            <Controller
              control={control}
              name="rules.oversPerInnings"
              render={({ field }) => (
                <NumberStepper
                  label="Overs per innings"
                  value={Number(field.value)}
                  min={1}
                  max={50}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue('rules.maxOversPerBowler', defaultMaxOversPerBowler(v));
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name="rules.playersPerSide"
              render={({ field }) => <NumberStepper label="Players per side" value={Number(field.value)} min={2} max={15} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="rules.maxOversPerBowler"
              render={({ field }) => (
                <NumberStepper
                  label="Max overs per bowler"
                  hint="0 = no limit"
                  value={field.value ?? 0}
                  min={0}
                  max={watch('rules.oversPerInnings') ?? 50}
                  onChange={(v) => field.onChange(v === 0 ? null : v)}
                />
              )}
            />
            <FormField control={control} name="ground" label="Ground (optional)" parse={(t) => (t === '' ? undefined : t)} />
            {error ? <ErrorState message={errorMessage(error)} /> : null}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create match'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
