import { Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { defaultMaxOversPerBowler } from '@cricket/engine';
import { createSingleMatchSchema, type CreateSingleMatchInput } from '@cricket/shared';
import { View } from 'react-native';
import { useCreateMatch, useTeams } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, Chip, ErrorBanner, FormField, NumberStepper, Screen, Text, space } from '@/ui';

type FormValues = z.input<typeof createSingleMatchSchema>;

export default function NewMatch() {
  const router = useRouter();
  const create = useCreateMatch();
  const teams = useTeams();
  const { control, handleSubmit, setValue, watch } = useForm<FormValues, any, CreateSingleMatchInput>({
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

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New match' }} />
      <FormField control={control} name="teamAName" label="Team A" />
      <FormField control={control} name="teamBName" label="Team B" />
      {teams.data && teams.data.length > 0 ? (
        <>
          <Text variant="muted">Or pick one of your teams</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {teams.data.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                selected={t.name === a || t.name === b}
                onPress={() => setValue(a === '' || (a !== t.name && b !== '') ? 'teamAName' : 'teamBName', t.name, { shouldValidate: true })}
              />
            ))}
          </View>
        </>
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
            label="Max overs per bowler (0 = no limit)"
            value={field.value ?? 0}
            min={0}
            max={watch('rules.oversPerInnings') ?? 50}
            onChange={(v) => field.onChange(v === 0 ? null : v)}
          />
        )}
      />
      <FormField control={control} name="ground" label="Ground (optional)" parse={(t) => (t === '' ? undefined : t)} />

      {create.isError ? <ErrorBanner message={errorMessage(create.error)} /> : null}
      <Button
        title="Create match"
        loading={create.isPending}
        onPress={handleSubmit((v) => create.mutate(v, { onSuccess: (m) => router.replace(`/match/${m.id}`) }))}
      />
    </Screen>
  );
}
