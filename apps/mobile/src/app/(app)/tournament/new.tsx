import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GROUP_COUNTS, SCHEDULE_MODES, TOURNAMENT_FORMATS, type TournamentFormat } from '@cricket/shared';
import { useCreateTournament } from '@/hooks/queries';
import { buildTournamentInput, defaultDraft, describeGroupPlan, withOvers, type TournamentDraft } from '@cricket/client-core';
import { errorMessage } from '@/lib/query';
import { Button, Chip, ErrorBanner, NumberStepper, Screen, Segmented, Text, TextField, space } from '@/ui';

const FORMAT_LABEL: Record<TournamentFormat, string> = {
  league: 'League only',
  league_final: 'League + Final',
  league_semi_final: 'League + Semi-finals',
  knockout: 'Knockout',
  groups_knockout: 'Groups + Knockout',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NewTournament() {
  const router = useRouter();
  const create = useCreateTournament();
  const [d, setD] = useState<TournamentDraft>(defaultDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof TournamentDraft>(k: K, v: TournamentDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const auto = d.scheduleMode === 'auto';

  const submit = () => {
    const r = buildTournamentInput(d);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    create.mutate(r.data, { onSuccess: (t) => router.replace(`/tournament/${t.id}`) });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New tournament' }} />
      <TextField label="Tournament name" value={d.name} onChangeText={(v) => set('name', v)} error={errors.name} />

      <Text variant="label">Format</Text>
      <Segmented options={TOURNAMENT_FORMATS.values.map((f) => ({ value: f, label: FORMAT_LABEL[f] }))} value={d.format} onChange={(v) => set('format', v)} />
      {d.format === 'groups_knockout' ? (
        <>
          <Segmented options={GROUP_COUNTS.map((n) => ({ value: n, label: `${n} groups` }))} value={d.groupCount} onChange={(v) => set('groupCount', v)} />
          <Text variant="muted">{describeGroupPlan(d.teamCount, d.groupCount)}</Text>
        </>
      ) : null}
      <NumberStepper label="Number of teams" value={d.teamCount} min={2} max={32} onChange={(v) => set('teamCount', v)} />
      {errors.groupCount ? <Text variant="error">{errors.groupCount}</Text> : null}
      {errors.teamCount ? <Text variant="error">{errors.teamCount}</Text> : null}
      {d.format !== 'knockout' ? (
        <Chip label={d.doubleRoundRobin ? '✓ Everyone plays twice (home & away)' : 'Everyone plays once'} selected={d.doubleRoundRobin} onPress={() => set('doubleRoundRobin', !d.doubleRoundRobin)} />
      ) : null}
      <NumberStepper label="Overs per innings" value={d.overs} min={1} max={50} onChange={(v) => setD((p) => withOvers(p, v))} />
      <NumberStepper label="Max overs per bowler (0 = no limit)" value={d.maxOversPerBowler} min={0} max={d.overs} onChange={(v) => set('maxOversPerBowler', v)} />
      {errors.maxOversPerBowler ? <Text variant="error">{errors.maxOversPerBowler}</Text> : null}
      <NumberStepper label="Players per side" value={d.playersPerSide} min={2} max={15} onChange={(v) => set('playersPerSide', v)} />

      <Text variant="label">Fixtures</Text>
      <Segmented options={SCHEDULE_MODES.values.map((m) => ({ value: m, label: m === 'auto' ? 'Automatic dates' : 'I will set dates' }))} value={d.scheduleMode} onChange={(v) => set('scheduleMode', v)} />

      {auto ? (
        <View style={{ gap: space.md }}>
          <TextField label="First day (YYYY-MM-DD)" value={d.startDate} onChangeText={(v) => set('startDate', v)} autoCapitalize="none" error={errors['scheduler.startDate']} />
          <TextField label="Last day (YYYY-MM-DD)" value={d.endDate} onChangeText={(v) => set('endDate', v)} autoCapitalize="none" error={errors['scheduler.endDate']} />
          <TextField label="Match times each day (HH:mm, comma separated)" value={d.slots} onChangeText={(v) => set('slots', v)} autoCapitalize="none" error={errors['scheduler.slots']} />
          <TextField label="Grounds (comma separated)" value={d.grounds} onChangeText={(v) => set('grounds', v)} error={errors['scheduler.grounds']} />
          <Text variant="label">No matches on</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DAYS.map((name, i) => (
              <Chip key={name} label={name} selected={d.offWeekdays.includes(i)} onPress={() => set('offWeekdays', d.offWeekdays.includes(i) ? d.offWeekdays.filter((x) => x !== i) : [...d.offWeekdays, i])} />
            ))}
          </View>
          {errors.scheduler ? <Text variant="error">{errors.scheduler}</Text> : null}
        </View>
      ) : null}

      {create.isError ? <ErrorBanner message={errorMessage(create.error)} /> : null}
      <Button title="Create tournament" loading={create.isPending} onPress={submit} />
    </Screen>
  );
}
