import { zodResolver } from '@hookform/resolvers/zod';
import { scheduleMatchSchema, type ScheduleMatchInput } from '@cricket/shared';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useGetMatchQuery, useScheduleMatchMutation } from './matchesApi';

function ScheduleForm({ id, date, time, ground }: { id: string; date: string; time: string; ground: string }) {
  const navigate = useNavigate();
  const [schedule, { isLoading, error }] = useScheduleMatchMutation();
  const { control, handleSubmit } = useForm<ScheduleMatchInput>({
    resolver: zodResolver(scheduleMatchSchema),
    defaultValues: { scheduledDate: date, scheduledTime: time, ground },
  });
  const submit = handleSubmit(async (v) => {
    const res = await schedule({ matchId: id, input: v });
    if (!res.error) navigate(paths.app.match(id));
  });
  return (
    <Card className="max-w-xl">
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={(e) => void submit(e)}>
          <FormField control={control} name="scheduledDate" label="Date" type="date" />
          <FormField control={control} name="scheduledTime" label="Time" type="time" />
          <FormField control={control} name="ground" label="Ground (optional)" parse={(t) => (t === '' ? undefined : t)} />
          {error ? <ErrorState message={errorMessage(error)} /> : null}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SchedulePage() {
  const { id = '' } = useParams();
  const match = useGetMatchQuery(id);
  return (
    <>
      <PageHeader title="Date & time" backTo={paths.app.match(id)} />
      <QueryBoundary query={match}>
        {(m) => <ScheduleForm id={id} date={m.scheduledDate?.slice(0, 10) ?? ''} time={m.scheduledTime ?? ''} ground={m.ground ?? ''} />}
      </QueryBoundary>
    </>
  );
}
