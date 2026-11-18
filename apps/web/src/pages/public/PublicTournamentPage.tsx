import { useParams } from 'react-router-dom';
import { FixturesList, StandingsView, TournamentAwards } from '@/components/cricket/TournamentView';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetTournamentQuery } from '@/features/tournaments/tournamentsApi';
import { paths } from '@/lib/paths';

const STATUS_LABEL = { draft: 'Setting up', live: 'In progress', completed: 'Completed' } as const;
const STATUS_VARIANT = { draft: 'secondary', live: 'live', completed: 'success' } as const;

export function PublicTournamentPage() {
  const { id = '' } = useParams();
  const tournament = useGetTournamentQuery(id, { pollingInterval: 30_000, skipPollingIfUnfocused: true });
  return (
    <>
      <PageHeader title={tournament.data?.name ?? 'Tournament'} backTo={paths.home} />
      <QueryBoundary query={tournament}>
        {(t) => (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              <Badge variant="outline">{t.rules.oversPerInnings} overs</Badge>
              <Badge variant="outline">{t.teams.length} teams</Badge>
            </div>
            <TournamentAwards id={t.id} />
            <Tabs defaultValue={t.status === 'draft' ? 'table' : 'fixtures'}>
              <TabsList>
                <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
              <TabsContent value="fixtures">
                <FixturesList id={t.id} mode="public" />
              </TabsContent>
              <TabsContent value="table">
                <StandingsView id={t.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
