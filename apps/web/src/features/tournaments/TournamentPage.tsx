import { useState } from 'react';
import type { TournamentDetail } from '@cricket/client-core';
import { useParams } from 'react-router-dom';
import { FixturesList, StandingsView, TournamentAwards } from '@/components/cricket/TournamentView';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { TeamBadge } from '@/components/common/TeamBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/app/hooks';
import { useGetTeamsQuery } from '@/features/teams/teamsApi';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import {
  useAddTournamentScorerMutation,
  useAddTournamentTeamMutation,
  useGenerateFixturesMutation,
  useGetTournamentQuery,
  useRemoveTournamentTeamMutation,
} from './tournamentsApi';

const STATUS_LABEL = { draft: 'Setting up', live: 'In progress', completed: 'Completed' } as const;
const STATUS_VARIANT = { draft: 'secondary', live: 'live', completed: 'success' } as const;

function TeamsSection({ t, canManage }: { t: TournamentDetail; canManage: boolean }) {
  const myTeams = useGetTeamsQuery(undefined, { skip: !canManage });
  const [addTeam, add] = useAddTournamentTeamMutation();
  const [removeTeam, remove] = useRemoveTournamentTeamMutation();
  const [addScorer, scorer] = useAddTournamentScorerMutation();
  const [generate, gen] = useGenerateFixturesMutation();
  const [email, setEmail] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const draft = t.status === 'draft';
  const entered = new Set(t.teams.map((e) => e.teamId));
  const available = (myTeams.data ?? []).filter((x) => !entered.has(x.id));
  const full = t.teams.length >= t.teamCount;

  return (
    <div className="space-y-5">
      <h2 className="font-semibold">
        Teams ({t.teams.length}/{t.teamCount})
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {t.teams.map((e) => (
          <Card key={e.teamId} className="py-3">
            <CardContent className="flex items-center gap-3">
              <TeamBadge shortName={e.team.shortName} color={e.team.color} />
              <span className="min-w-0 flex-1 truncate font-medium">{e.team.name}</span>
              {canManage && draft ? (
                <Button variant="ghost" size="sm" disabled={remove.isLoading} onClick={() => void removeTeam({ id: t.id, teamId: e.teamId })}>
                  Remove
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {remove.isError ? <ErrorState message={errorMessage(remove.error)} /> : null}

      {canManage && draft && !full ? (
        <Card>
          <CardContent className="space-y-3">
            <Label>Add one of your teams</Label>
            {available.length === 0 ? <p className="text-sm text-muted-foreground">No more teams. Create teams in the Teams page first.</p> : null}
            <div className="flex flex-wrap gap-2">
              {available.map((x) => (
                <Button key={x.id} variant="outline" size="sm" disabled={add.isLoading} onClick={() => void addTeam({ id: t.id, teamId: x.id })}>
                  {x.name}
                </Button>
              ))}
            </div>
            {add.isError ? <ErrorState message={errorMessage(add.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {canManage && draft && full ? (
        <div className="space-y-3">
          {gen.isError ? <ErrorState message={errorMessage(gen.error)} /> : null}
          <Button size="lg" disabled={gen.isLoading} onClick={() => setConfirmOpen(true)}>
            Create fixtures
          </Button>
        </div>
      ) : null}

      {canManage ? (
        <Card className="max-w-xl">
          <CardContent className="space-y-3">
            <Label htmlFor="scorer-email">Add a scorer (they must have an account)</Label>
            <Input id="scorer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="scorer@example.com" />
            {scorer.isError ? <ErrorState message={errorMessage(scorer.error)} /> : null}
            {added ? <p className="text-sm text-muted-foreground">Added {added}.</p> : null}
            <Button
              variant="secondary"
              disabled={scorer.isLoading || !email.includes('@')}
              onClick={async () => {
                const res = await addScorer({ id: t.id, email: email.trim() });
                if (!res.error) {
                  setAdded(res.data.name);
                  setEmail('');
                }
              }}
            >
              Add scorer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create fixtures?"
        description="Teams can not be changed after this."
        confirmLabel="Create"
        loading={gen.isLoading}
        onConfirm={async () => {
          await generate(t.id);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}

function Detail({ t }: { t: TournamentDetail }) {
  const me = useCurrentUser()?.id;
  const canManage = t.members.some((m) => m.userId === me && m.role === 'organiser');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
        <Badge variant="outline">{t.rules.oversPerInnings} overs</Badge>
      </div>
      <TournamentAwards id={t.id} />
      <Tabs defaultValue={t.status === 'draft' ? 'teams' : 'fixtures'}>
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="teams">
          <TeamsSection t={t} canManage={canManage} />
        </TabsContent>
        <TabsContent value="fixtures">
          <FixturesList id={t.id} mode="app" />
        </TabsContent>
        <TabsContent value="table">
          <StandingsView id={t.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function TournamentPage() {
  const { id = '' } = useParams();
  const tournament = useGetTournamentQuery(id);
  return (
    <>
      <PageHeader
        title={tournament.data?.name ?? 'Tournament'}
        backTo={paths.app.events}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={paths.publicTournament(id)} target="_blank" rel="noreferrer">
              Public page
            </a>
          </Button>
        }
      />
      <QueryBoundary query={tournament}>{(t) => <Detail t={t} />}</QueryBoundary>
    </>
  );
}
