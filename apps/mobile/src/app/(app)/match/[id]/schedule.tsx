import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { scheduleMatchSchema, type ScheduleMatchInput } from '@cricket/shared';
import { useMatch, useScheduleMatch } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, ErrorBanner, FormField, QueryBoundary, Screen } from '@/ui';

function Form({ id, date, time, ground }: { id: string; date: string; time: string; ground: string }) {
  const router = useRouter();
  const save = useScheduleMatch(id);
  const { control, handleSubmit } = useForm<ScheduleMatchInput, any, ScheduleMatchInput>({
    resolver: zodResolver(scheduleMatchSchema),
    defaultValues: { scheduledDate: date, scheduledTime: time, ground },
  });
  return (
    <>
      <FormField control={control} name="scheduledDate" label="Date (YYYY-MM-DD)" autoCapitalize="none" />
      <FormField control={control} name="scheduledTime" label="Time (HH:mm, 24 hour)" autoCapitalize="none" />
      <FormField control={control} name="ground" label="Ground (optional)" parse={(t) => (t === '' ? undefined : t)} />
      {save.isError ? <ErrorBanner message={errorMessage(save.error)} /> : null}
      <Button title="Save" loading={save.isPending} onPress={handleSubmit((v) => save.mutate(v, { onSuccess: () => router.back() }))} />
    </>
  );
}

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Date & time' }} />
      <QueryBoundary query={match}>
        {(m) => <Form id={id} date={m.scheduledDate?.slice(0, 10) ?? ''} time={m.scheduledTime ?? ''} ground={m.ground ?? ''} />}
      </QueryBoundary>
    </Screen>
  );
}
