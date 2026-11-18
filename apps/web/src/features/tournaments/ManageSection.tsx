import { useEffect, useState } from 'react';
import {
  buildTournamentUpdate,
  describeGroupPlan,
  editScope,
  NOTICE_LABEL,
  POSTABLE_NOTICE_KINDS,
  settingsDraftFrom,
  withOvers,
  type SettingsDraft,
  type TournamentDetail,
} from '@cricket/client-core';
import { GROUP_COUNTS, type NoticeKind } from '@cricket/shared';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { NumberStepper } from '@/components/common/NumberStepper';
import { NoticeItem } from '@/components/cricket/NoticesBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import {
  useAddTournamentNoticeMutation,
  useGetTournamentNoticesQuery,
  usePauseTournamentMutation,
  useResolveTournamentNoticeMutation,
  useResumeTournamentMutation,
  useUpdateTournamentMutation,
} from './tournamentsApi';

function SettingsCard({ t }: { t: TournamentDetail }) {
  const scope = editScope(t.status);
  const [d, setD] = useState<SettingsDraft>(() => settingsDraftFrom(t));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [update, upd] = useUpdateTournamentMutation();
  useEffect(() => setD(settingsDraftFrom(t)), [t]);
  const set = <K extends keyof SettingsDraft>(k: K, v: SettingsDraft[K]) => {
    setNote(null);
    setD((x) => ({ ...x, [k]: v }));
  };

  const save = async () => {
    const r = buildTournamentUpdate(d, t);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    if (!r.changes) return setNote('Nothing changed.');
    const res = await update({ id: t.id, input: r.changes });
    if ('data' in res) {
      const n = res.data?.updatedMatches ?? 0;
      setNote(n > 0 ? `Saved. New rules applied to ${n} upcoming match${n === 1 ? '' : 'es'}.` : 'Saved.');
    }
  };

  if (t.status === 'completed') {
    return <p className="text-sm text-muted-foreground">This tournament is completed. Settings are locked.</p>;
  }
  return (
    <Card>
      <CardContent className="space-y-5">
        <h3 className="font-semibold">Settings</h3>
        <div className="space-y-1.5">
          <Label htmlFor="s-name">Tournament name</Label>
          <Input id="s-name" value={d.name} onChange={(e) => set('name', e.target.value)} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <NumberStepper label="Overs per innings" value={d.overs} min={1} max={50} onChange={(v) => { setNote(null); setD((x) => withOvers(x, v)); }} />
            {errors.overs ? <p className="mt-1 text-xs text-destructive">{errors.overs}</p> : null}
          </div>
          <NumberStepper label="Players per side" value={d.playersPerSide} min={2} max={15} onChange={(v) => set('playersPerSide', v)} />
          <div>
            <NumberStepper label="Max overs per bowler" hint="0 = no limit" value={d.maxOversPerBowler} min={0} max={d.overs} onChange={(v) => set('maxOversPerBowler', v)} />
            {errors.maxOversPerBowler ? <p className="mt-1 text-xs text-destructive">{errors.maxOversPerBowler}</p> : null}
          </div>
        </div>
        {t.status !== 'draft' ? (
          <p className="text-xs text-muted-foreground">
            Overs and players apply to matches that have not started. Matches already in play or finished keep the rules they were played under.
          </p>
        ) : null}

        {scope.structure ? (
          <div className="space-y-4">
            <NumberStepper label="Number of teams" value={d.teamCount} min={2} max={32} onChange={(v) => set('teamCount', v)} />
            {errors.teamCount ? <p className="text-xs text-destructive">{errors.teamCount}</p> : null}
            {t.format === 'groups_knockout' ? (
              <div className="space-y-2">
                <Label>Number of groups</Label>
                <ChoiceGroup label="Number of groups" options={GROUP_COUNTS.map((n) => ({ value: n, label: `${n} groups` }))} value={d.groupCount} onChange={(v) => set('groupCount', v)} />
                <p className="text-sm text-muted-foreground">{describeGroupPlan(d.teamCount, d.groupCount)}</p>
                {errors.groupCount ? <p className="text-xs text-destructive">{errors.groupCount}</p> : null}
              </div>
            ) : null}
            {t.format !== 'knockout' ? (
              <ChoiceGroup
                label="Rounds"
                options={[{ value: 'once', label: 'Everyone plays once' }, { value: 'twice', label: 'Twice (home & away)' }] as const}
                value={d.doubleRoundRobin ? 'twice' : 'once'}
                onChange={(v) => set('doubleRoundRobin', v === 'twice')}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Teams, groups and round-robin type are locked once fixtures are created.</p>
        )}

        <div className="space-y-2">
          <Label>Points</Label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberStepper label="Win" value={d.win} min={0} max={10} onChange={(v) => set('win', v)} />
            <NumberStepper label="Tie" value={d.tie} min={0} max={10} onChange={(v) => set('tie', v)} />
            <NumberStepper label="No result" value={d.noResult} min={0} max={10} onChange={(v) => set('noResult', v)} />
            <NumberStepper label="Loss" value={d.loss} min={0} max={10} onChange={(v) => set('loss', v)} />
          </div>
          {t.status !== 'draft' ? <p className="text-xs text-muted-foreground">The table is recalculated with the new points straight away.</p> : null}
        </div>

        {upd.isError ? <ErrorState message={errorMessage(upd.error)} /> : null}
        {note ? <p role="status" className="text-sm text-primary">{note}</p> : null}
        <Button onClick={() => void save()} disabled={upd.isLoading}>
          {upd.isLoading ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PauseCard({ t }: { t: TournamentDetail }) {
  const [pause, p] = usePauseTournamentMutation();
  const [resume, r] = useResumeTournamentMutation();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  if (t.status === 'paused') {
    return (
      <Card className="border-warning">
        <CardContent className="space-y-3">
          <h3 className="font-semibold">Play is paused</h3>
          <p className="text-sm text-muted-foreground">Scorers cannot record balls and playoff places stay frozen. The public page shows the notice.</p>
          <Textarea aria-label="Message when resuming" placeholder="Optional message for the public page, e.g. play restarts at 3pm" value={message} onChange={(e) => setMessage(e.target.value)} />
          {r.isError ? <ErrorState message={errorMessage(r.error)} /> : null}
          <Button disabled={r.isLoading} onClick={() => void resume({ id: t.id, input: { message } }).then(() => setMessage(''))}>
            {r.isLoading ? 'Resuming…' : 'Resume tournament'}
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (t.status !== 'live') return null;
  return (
    <Card>
      <CardContent className="space-y-3">
        <h3 className="font-semibold">Pause tournament</h3>
        <p className="text-sm text-muted-foreground">Use this for a dispute, bad weather or any problem. Everyone sees a notice on the public page and scoring is blocked until you resume.</p>
        <Input aria-label="Reason" placeholder="Reason, e.g. Heavy rain at the ground" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        <Textarea aria-label="Details" placeholder="Details (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
        {p.isError ? <ErrorState message={errorMessage(p.error)} /> : null}
        <Button variant="destructive" disabled={reason.trim().length < 3} onClick={() => setOpen(true)}>
          Pause tournament
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Pause the tournament?"
          description="Scoring stops for every match until you resume."
          confirmLabel="Pause"
          destructive
          loading={p.isLoading}
          onConfirm={async () => {
            const res = await pause({ id: t.id, input: { reason: reason.trim(), message: message.trim() } });
            if ('data' in res) {
              setOpen(false);
              setReason('');
              setMessage('');
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function NoticesCard({ t }: { t: TournamentDetail }) {
  const notices = useGetTournamentNoticesQuery(t.id);
  const [add, a] = useAddTournamentNoticeMutation();
  const [resolve, r] = useResolveTournamentNoticeMutation();
  const [kind, setKind] = useState<NoticeKind>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const list = notices.data ?? [];
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="font-semibold">Announcements</h3>
        <ChoiceGroup label="Type" options={POSTABLE_NOTICE_KINDS.map((k) => ({ value: k, label: NOTICE_LABEL[k] }))} value={kind} onChange={setKind} />
        <Input aria-label="Title" placeholder="Title, e.g. Matches start 1 hour late" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Textarea aria-label="Message" placeholder="Details (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
        {a.isError ? <ErrorState message={errorMessage(a.error)} /> : null}
        <Button
          disabled={title.trim().length < 3 || a.isLoading}
          onClick={async () => {
            const res = await add({ id: t.id, input: { kind, title: title.trim(), message: message.trim() } });
            if ('data' in res) {
              setTitle('');
              setMessage('');
            }
          }}
        >
          Post to public page
        </Button>

        {r.isError ? <ErrorState message={errorMessage(r.error)} /> : null}
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="flex items-start gap-2">
              <NoticeItem n={n} className={`flex-1 ${n.active ? '' : 'opacity-60'}`} />
              {n.active && n.kind !== 'paused' ? (
                <Button variant="outline" size="sm" disabled={r.isLoading} onClick={() => void resolve({ id: t.id, noticeId: n.id })}>
                  Resolve
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Organiser-only tab: edit settings, pause/resume play, and talk to the public. */
export function ManageSection({ t }: { t: TournamentDetail }) {
  return (
    <div className="space-y-5">
      <PauseCard t={t} />
      <SettingsCard t={t} />
      {t.status === 'completed' ? null : <NoticesCard t={t} />}
    </div>
  );
}
