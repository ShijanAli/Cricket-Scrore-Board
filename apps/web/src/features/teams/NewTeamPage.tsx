import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, type CreateTeamFormValues, type CreateTeamInput } from '@cricket/shared';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { TeamBadge } from '@/components/common/TeamBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { useCreateTeamMutation } from './teamsApi';

const PALETTE = ['#0E7C4A', '#1565C0', '#C62828', '#EF6C00', '#6A1B9A', '#00838F', '#37474F', '#AD1457'];

export function NewTeamPage() {
  const navigate = useNavigate();
  const [createTeam, { isLoading, error }] = useCreateTeamMutation();
  const { control, handleSubmit, watch } = useForm<CreateTeamFormValues, unknown, CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', shortName: '', color: PALETTE[0] },
  });
  const short = watch('shortName');
  const color = watch('color') ?? PALETTE[0]!;

  const submit = handleSubmit(async (v) => {
    const res = await createTeam(v);
    if (!res.error) navigate(paths.app.team(res.data.id), { replace: true });
  });

  return (
    <>
      <PageHeader title="New team" backTo={paths.app.teams} />
      <Card className="max-w-xl">
        <CardContent>
          <form className="space-y-5" noValidate onSubmit={(e) => void submit(e)}>
            <div className="flex justify-center">
              <TeamBadge shortName={(short || '??').toUpperCase().slice(0, 4)} color={color} size="lg" />
            </div>
            <FormField control={control} name="name" label="Team name" />
            <FormField control={control} name="shortName" label="Short name" hint="2–4 letters" maxLength={4} className="uppercase" />
            <div className="space-y-2">
              <Label>Colour</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Colour ${c}`}
                        aria-pressed={field.value === c}
                        onClick={() => field.onChange(c)}
                        className={cn('size-9 rounded-full ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-ring', field.value === c && 'ring-2 ring-foreground')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              />
            </div>
            <FormField
              control={control}
              name="contactNumber"
              label="Contact number (optional)"
              hint="01XXXXXXXXX"
              inputMode="tel"
              parse={(t) => (t === '' ? undefined : t)}
            />
            {error ? <ErrorState message={errorMessage(error)} /> : null}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create team'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
