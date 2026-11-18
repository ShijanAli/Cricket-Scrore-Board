import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  NOTICE_LABEL,
  POSTABLE_NOTICE_KINDS,
  buildTournamentUpdate,
  describeGroupPlan,
  editScope,
  settingsDraftFrom,
  type SettingsDraft,
  type TournamentDetail,
} from '@cricket/client-core';
import { GROUP_COUNTS, type NoticeKind } from '@cricket/shared';
import { NoticeItem } from '@/cricket/NoticesBanner';
import {
  useAddTournamentNotice,
  usePauseTournament,
  useResolveTournamentNotice,
  useResumeTournament,
  useTournamentNotices,
  useUpdateTournament,
} from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, Card, ErrorBanner, NumberStepper, Segmented, Text, TextField, space } from '@/ui';

function SettingsCard({ t }: { t: TournamentDetail }) {
  const scope = editScope(t.status);
  const update = useUpdateTournament(t.id);
  const [d, setD] = useState<SettingsDraft>(() => settingsDraftFrom(t));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setD(settingsDraftFrom(t)), [t]);
  const set = <K extends keyof SettingsDraft>(k: K, v: SettingsDraft[K]) => {
    setNote(null);
    setD((x) => ({ ...x, [k]: v }));
  };

  if (t.status === 'completed') return <Text variant="muted">This tournament is completed. Settings are locked.</Text>;

  const save = () => {
    const r = buildTournamentUpdate(d, t);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    if (!r.changes) return setNote('Nothing changed.');
    update.mutate(r.changes, {
      onSuccess: (res) => setNote(res.updatedMatches > 0 ? `Saved. New rules applied to ${res.updatedMatches} upcoming match(es).` : 'Saved.'),
    });
  };

  return (
    <Card style={{ gap: space.md }}>
      <Text variant="title">Settings</Text>
      <TextField label="Tournament name" value={d.name} onChangeText={(v) => set('name', v)} error={errors.name} />
      <NumberStepper label="Overs per innings" value={d.overs} min={1} max={50} onChange={(v) => set('overs', v)} />
      {errors.overs ? <Text variant="error">{errors.overs}</Text> : null}
      <NumberStepper label="Players per side" value={d.playersPerSide} min={2} max={15} onChange={(v) => set('playersPerSide', v)} />
      {t.status !== 'draft' ? (
        <Text variant="muted">Overs and players apply to matches that have not started. Matches in play or finished keep their rules.</Text>
      ) : null}

      {scope.structure ? (
        <>
          <NumberStepper label="Number of teams" value={d.teamCount} min={2} max={32} onChange={(v) => set('teamCount', v)} />
          {errors.teamCount ? <Text variant="error">{errors.teamCount}</Text> : null}
          {t.format === 'groups_knockout' ? (
            <>
              <Segmented options={GROUP_COUNTS.map((n) => ({ value: n, label: `${n} groups` }))} value={d.groupCount} onChange={(v) => set('groupCount', v)} />
              <Text variant="muted">{describeGroupPlan(d.teamCount, d.groupCount)}</Text>
              {errors.groupCount ? <Text variant="error">{errors.groupCount}</Text> : null}
            </>
          ) : null}
          {t.format !== 'knockout' ? (
            <Segmented
              options={[{ value: 'once', label: 'Play once' }, { value: 'twice', label: 'Home & away' }] as const}
              value={d.doubleRoundRobin ? 'twice' : 'once'}
              onChange={(v) => set('doubleRoundRobin', v === 'twice')}
            />
          ) : null}
        </>
      ) : (
        <Text variant="muted">Teams, groups and round-robin type are locked once fixtures are created.</Text>
      )}

      <Text variant="label">Points</Text>
      <NumberStepper label="Win" value={d.win} min={0} max={10} onChange={(v) => set('win', v)} />
      <NumberStepper label="Tie" value={d.tie} min={0} max={10} onChange={(v) => set('tie', v)} />
      <NumberStepper label="No result" value={d.noResult} min={0} max={10} onChange={(v) => set('noResult', v)} />
      <NumberStepper label="Loss" value={d.loss} min={0} max={10} onChange={(v) => set('loss', v)} />

      {update.isError ? <ErrorBanner message={errorMessage(update.error)} /> : null}
      {note ? <Text variant="muted">{note}</Text> : null}
      <Button title="Save changes" onPress={save} loading={update.isPending} />
    </Card>
  );
}

function PauseCard({ t }: { t: TournamentDetail }) {
  const pause = usePauseTournament(t.id);
  const resume = useResumeTournament(t.id);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  if (t.status === 'paused') {
    return (
      <Card style={{ gap: space.sm }}>
        <Text variant="title">Play is paused</Text>
        <Text variant="muted">Scorers cannot record balls and playoff places stay frozen.</Text>
        <TextField label="Message for the public page (optional)" value={message} onChangeText={setMessage} multiline />
        {resume.isError ? <ErrorBanner message={errorMessage(resume.error)} /> : null}
        <Button title="Resume tournament" onPress={() => resume.mutate({ message: message.trim() }, { onSuccess: () => setMessage('') })} loading={resume.isPending} />
      </Card>
    );
  }
  if (t.status !== 'live') return null;
  const confirm = () =>
    Alert.alert('Pause the tournament?', 'Scoring stops for every match until you resume.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pause',
        style: 'destructive',
        onPress: () => pause.mutate({ reason: reason.trim(), message: message.trim() }, { onSuccess: () => { setReason(''); setMessage(''); } }),
      },
    ]);
  return (
    <Card style={{ gap: space.sm }}>
      <Text variant="title">Pause tournament</Text>
      <Text variant="muted">For a dispute, bad weather or any problem. A notice shows on the public page and scoring is blocked until you resume.</Text>
      <TextField label="Reason" placeholder="e.g. Heavy rain at the ground" value={reason} onChangeText={setReason} maxLength={200} />
      <TextField label="Details (optional)" value={message} onChangeText={setMessage} multiline />
      {pause.isError ? <ErrorBanner message={errorMessage(pause.error)} /> : null}
      <Button title="Pause tournament" variant="danger" onPress={confirm} disabled={reason.trim().length < 3} loading={pause.isPending} />
    </Card>
  );
}

function NoticesCard({ t }: { t: TournamentDetail }) {
  const notices = useTournamentNotices(t.id);
  const add = useAddTournamentNotice(t.id);
  const resolve = useResolveTournamentNotice(t.id);
  const [kind, setKind] = useState<NoticeKind>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Card style={{ gap: space.sm }}>
      <Text variant="title">Announcements</Text>
      <Segmented options={POSTABLE_NOTICE_KINDS.slice(0, 4).map((k) => ({ value: k, label: NOTICE_LABEL[k] }))} value={kind} onChange={setKind} />
      <TextField label="Title" placeholder="e.g. Matches start 1 hour late" value={title} onChangeText={setTitle} maxLength={120} />
      <TextField label="Message (optional)" value={message} onChangeText={setMessage} multiline />
      {add.isError ? <ErrorBanner message={errorMessage(add.error)} /> : null}
      <Button
        title="Post to public page"
        disabled={title.trim().length < 3}
        loading={add.isPending}
        onPress={() => add.mutate({ kind, title: title.trim(), message: message.trim() }, { onSuccess: () => { setTitle(''); setMessage(''); } })}
      />
      {resolve.isError ? <ErrorBanner message={errorMessage(resolve.error)} /> : null}
      <View style={{ gap: space.sm }}>
        {(notices.data ?? []).map((n) => (
          <View key={n.id} style={{ gap: space.xs }}>
            <NoticeItem n={n} dim={!n.active} />
            {n.active && n.kind !== 'paused' ? <Button title="Resolve" variant="secondary" compact onPress={() => resolve.mutate(n.id)} loading={resolve.isPending} /> : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Organiser-only tab: edit settings, pause/resume play, talk to the public. */
export function ManageSection({ t }: { t: TournamentDetail }) {
  return (
    <View style={{ gap: space.md }}>
      <PauseCard t={t} />
      <SettingsCard t={t} />
      {t.status === 'completed' ? null : <NoticesCard t={t} />}
    </View>
  );
}
