import { useState } from 'react';
import { buildTournamentInput, defaultDraft, describeGroupPlan, withOvers, type TournamentDraft } from '@cricket/client-core';
import { GROUP_COUNTS, SCHEDULE_MODES, TOURNAMENT_FORMATS, type TournamentFormat } from '@cricket/shared';
import { useNavigate } from 'react-router-dom';
import { ChoiceGroup, MultiChoiceGroup } from '@/components/common/ChoiceGroup';
import { ErrorState } from '@/components/common/ErrorState';
import { NumberStepper } from '@/components/common/NumberStepper';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useCreateTournamentMutation } from './tournamentsApi';

const FORMAT_LABEL: Record<TournamentFormat, string> = {
  league: 'League only',
  league_final: 'League + Final',
  league_semi_final: 'League + Semi-finals',
  knockout: 'Knockout',
  groups_knockout: 'Groups + Knockout (World Cup style)',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Field({ id, label, error, hint, ...props }: { id: string; label: string; error?: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={!!error} {...props} />
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function NewTournamentPage() {
  const navigate = useNavigate();
  const [createTournament, { isLoading, error }] = useCreateTournamentMutation();
  const [d, setD] = useState<TournamentDraft>(defaultDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof TournamentDraft>(k: K, v: TournamentDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const auto = d.scheduleMode === 'auto';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = buildTournamentInput(d);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    const res = await createTournament(r.data);
    if (!res.error) navigate(paths.app.tournament(res.data.id), { replace: true });
  };

  return (
    <>
      <PageHeader title="New tournament" backTo={paths.app.events} />
      <Card className="max-w-2xl">
        <CardContent>
          <form className="space-y-6" noValidate onSubmit={(e) => void submit(e)}>
            <Field id="t-name" label="Tournament name" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />

            <div className="space-y-2">
              <Label>Format</Label>
              <ChoiceGroup label="Format" options={TOURNAMENT_FORMATS.values.map((f) => ({ value: f, label: FORMAT_LABEL[f] }))} value={d.format} onChange={(v) => set('format', v)} />
            </div>

            {d.format === 'groups_knockout' ? (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                <Label>Number of groups</Label>
                <ChoiceGroup label="Number of groups" options={GROUP_COUNTS.map((n) => ({ value: n, label: `${n} groups` }))} value={d.groupCount} onChange={(v) => set('groupCount', v)} />
                <p className="text-sm text-muted-foreground">{describeGroupPlan(d.teamCount, d.groupCount)}</p>
                {errors.groupCount ? <p role="alert" className="text-xs text-destructive">{errors.groupCount}</p> : null}
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <NumberStepper label="Number of teams" value={d.teamCount} min={2} max={32} onChange={(v) => set('teamCount', v)} />
                {errors.teamCount ? <p className="mt-1 text-xs text-destructive">{errors.teamCount}</p> : null}
              </div>
              <NumberStepper label="Overs per innings" value={d.overs} min={1} max={50} onChange={(v) => setD((p) => withOvers(p, v))} />
              <NumberStepper label="Players per side" value={d.playersPerSide} min={2} max={15} onChange={(v) => set('playersPerSide', v)} />
            </div>

            <div>
              <NumberStepper label="Max overs per bowler" hint="0 = no limit" value={d.maxOversPerBowler} min={0} max={d.overs} onChange={(v) => set('maxOversPerBowler', v)} />
              {errors.maxOversPerBowler ? <p role="alert" className="mt-1 text-xs text-destructive">{errors.maxOversPerBowler}</p> : null}
            </div>

            {d.format !== 'knockout' ? (
              <ChoiceGroup
                label="Rounds"
                options={[{ value: 'once', label: 'Everyone plays once' }, { value: 'twice', label: 'Twice (home & away)' }] as const}
                value={d.doubleRoundRobin ? 'twice' : 'once'}
                onChange={(v) => set('doubleRoundRobin', v === 'twice')}
              />
            ) : null}

            <div className="space-y-2">
              <Label>Fixtures</Label>
              <ChoiceGroup
                label="Fixtures"
                options={SCHEDULE_MODES.values.map((m) => ({ value: m, label: m === 'auto' ? 'Automatic dates' : 'I will set dates' }))}
                value={d.scheduleMode}
                onChange={(v) => set('scheduleMode', v)}
              />
            </div>

            {auto ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="t-start" label="First day" type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors['scheduler.startDate']} />
                  <Field id="t-end" label="Last day" type="date" value={d.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors['scheduler.endDate']} />
                </div>
                <Field id="t-slots" label="Match times each day" hint="HH:mm, comma separated (24 hour)" value={d.slots} onChange={(e) => set('slots', e.target.value)} error={errors['scheduler.slots']} />
                <Field id="t-grounds" label="Grounds" hint="Comma separated" value={d.grounds} onChange={(e) => set('grounds', e.target.value)} error={errors['scheduler.grounds']} />
                <div className="space-y-2">
                  <Label>No matches on</Label>
                  <MultiChoiceGroup label="Off days" options={DAYS.map((name, i) => ({ value: i, label: name }))} value={d.offWeekdays} onChange={(v) => set('offWeekdays', v)} />
                </div>
                {errors.scheduler ? <p role="alert" className="text-xs text-destructive">{errors.scheduler}</p> : null}
              </div>
            ) : null}

            {error ? <ErrorState message={errorMessage(error)} /> : null}
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create tournament'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
