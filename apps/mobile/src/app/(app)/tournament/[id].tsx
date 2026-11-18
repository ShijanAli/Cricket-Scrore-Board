import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { groupByStage, groupStandings, type TournamentDetail } from '@cricket/client-core';
import { AwardsCard } from '@/cricket/AwardsCard';
import { FixtureRow } from '@/cricket/FixtureRow';
import { StandingsTable } from '@/cricket/StandingsTable';
import {
  useAddTournamentScorer,
  useAddTournamentTeam,
  useFixtures,
  useGenerateFixtures,
  useRemoveTournamentTeam,
  useStandings,
  useTournamentAwards,
  useTeams,
  useTournament,
} from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { useAuth } from '@/state/auth';
import { Badge, Button, Card, Chip, EmptyState, ErrorBanner, QueryBoundary, Screen, Segmented, TeamBadge, Text, TextField, space } from '@/ui';

type Tab = 'teams' | 'fixtures' | 'table';

function TeamsSection({ t, canManage }: { t: TournamentDetail; canManage: boolean }) {
  const myTeams = useTeams();
  const add = useAddTournamentTeam(t.id);
  const remove = useRemoveTournamentTeam(t.id);
  const scorer = useAddTournamentScorer(t.id);
  const generate = useGenerateFixtures(t.id);
  const [email, setEmail] = useState('');
  const draft = t.status === 'draft';
  const entered = new Set(t.teams.map((e) => e.teamId));
  const available = (myTeams.data ?? []).filter((x) => !entered.has(x.id));
  const full = t.teams.length >= t.teamCount;

  const confirmGenerate = () =>
    Alert.alert('Create fixtures?', 'Teams can not be changed after this.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create', onPress: () => generate.mutate() },
    ]);

  return (
    <>
      <Text variant="title">
        Teams ({t.teams.length}/{t.teamCount})
      </Text>
      {t.teams.map((e) => (
        <Card key={e.teamId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <TeamBadge shortName={e.team.shortName} color={e.team.color} />
          <Text variant="label" style={{ flex: 1 }}>{e.team.name}</Text>
          {e.groupName ? <Badge label={`Group ${e.groupName}`} /> : null}
          {canManage && draft ? <Button title="Remove" variant="ghost" compact onPress={() => remove.mutate(e.teamId)} /> : null}
        </Card>
      ))}
      {t.format === 'groups_knockout' && draft ? (
        <Text variant="muted">Groups are drawn automatically by seed when you create fixtures. The top 2 of each group go to the knockout.</Text>
      ) : null}
      {remove.isError ? <ErrorBanner message={errorMessage(remove.error)} /> : null}

      {canManage && draft && !full ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="label">Add one of your teams</Text>
          {available.length === 0 ? <Text variant="muted">No more teams. Create teams in the Teams tab first.</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {available.map((x) => <Chip key={x.id} label={x.name} onPress={() => add.mutate(x.id)} />)}
          </View>
          {add.isError ? <ErrorBanner message={errorMessage(add.error)} /> : null}
        </Card>
      ) : null}

      {canManage && draft && full ? (
        <>
          {generate.isError ? <ErrorBanner message={errorMessage(generate.error)} /> : null}
          <Button title="Create fixtures" loading={generate.isPending} onPress={confirmGenerate} />
        </>
      ) : null}

      {canManage ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="label">Add a scorer (they must have an account)</Text>
          <TextField label="Scorer email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          {scorer.isError ? <ErrorBanner message={errorMessage(scorer.error)} /> : null}
          {scorer.isSuccess ? <Text variant="muted">Added {scorer.data.name}.</Text> : null}
          <Button title="Add scorer" variant="secondary" loading={scorer.isPending} disabled={!email.includes('@')} onPress={() => scorer.mutate(email.trim(), { onSuccess: () => setEmail('') })} />
        </Card>
      ) : null}
    </>
  );
}

function FixturesSection({ id }: { id: string }) {
  const router = useRouter();
  const fixtures = useFixtures(id);
  return (
    <QueryBoundary query={fixtures} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No fixtures yet" hint="Add all teams, then create fixtures." />}>
      {(list) =>
        groupByStage(list).map((g) => (
          <View key={g.stage} style={{ gap: space.sm }}>
            <Text variant="title">{g.label}</Text>
            {g.matches.map((m) => <FixtureRow key={m.id} match={m} onPress={() => router.push(`/match/${m.id}`)} />)}
          </View>
        ))
      }
    </QueryBoundary>
  );
}

function TableSection({ id }: { id: string }) {
  const standings = useStandings(id);
  return (
    <QueryBoundary query={standings} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No table yet" hint="The table appears once teams are added." />}>
      {(rows) => (
        <>
          {groupStandings(rows).map((g) => (
            <View key={g.label} style={{ gap: space.sm }}>
              {g.group ? (
                <Text variant="title">
                  {g.label} <Text variant="muted">· top 2 go through</Text>
                </Text>
              ) : null}
              <StandingsTable rows={g.rows} qualifyCount={g.group ? 2 : 0} />
            </View>
          ))}
        </>
      )}
    </QueryBoundary>
  );
}

function Detail({ t }: { t: TournamentDetail }) {
  const me = useAuth((s) => s.user?.id);
  const canManage = t.members.some((m) => m.userId === me && m.role === 'organiser');
  const [tab, setTab] = useState<Tab>(t.status === 'draft' ? 'teams' : 'fixtures');
  const awards = useTournamentAwards(t.id);
  return (
    <>
      <Stack.Screen options={{ title: t.name }} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Badge label={t.status === 'draft' ? 'Setting up' : t.status === 'live' ? 'In progress' : 'Completed'} tone={t.status === 'live' ? 'live' : t.status === 'completed' ? 'success' : 'neutral'} />
        <Badge label={`${t.rules.oversPerInnings} overs`} />
      </View>
      <AwardsCard awards={awards.data} />
      <Segmented options={[{ value: 'teams', label: 'Teams' }, { value: 'fixtures', label: 'Fixtures' }, { value: 'table', label: 'Table' }] as const} value={tab} onChange={setTab} />
      {tab === 'teams' ? <TeamsSection t={t} canManage={canManage} /> : null}
      {tab === 'fixtures' ? <FixturesSection id={t.id} /> : null}
      {tab === 'table' ? <TableSection id={t.id} /> : null}
    </>
  );
}

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournament = useTournament(id);
  return (
    <Screen>
      <QueryBoundary query={tournament}>{(t) => <Detail t={t} />}</QueryBoundary>
    </Screen>
  );
}
