import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetSeriesListQuery } from '@/features/series/seriesApi';
import { paths } from '@/lib/paths';
import { useGetTournamentsQuery } from './tournamentsApi';

const FORMAT_LABEL: Record<string, string> = {
  league: 'League',
  league_final: 'League + Final',
  league_semi_final: 'League + Semi-finals',
  knockout: 'Knockout',
};
const STATUS_LABEL = { draft: 'Setting up', live: 'In progress', completed: 'Completed' } as const;
const STATUS_VARIANT = { draft: 'secondary', live: 'live', completed: 'success' } as const;

function TournamentList() {
  const tournaments = useGetTournamentsQuery();
  return (
    <QueryBoundary query={tournaments} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No tournaments yet" hint="Create a league or knockout for your teams." />}>
      {(list) => (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <Link key={t.id} to={paths.app.tournament(t.id)} className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              <Card className="gap-2 py-4 transition-shadow hover:shadow-md">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {FORMAT_LABEL[t.format] ?? t.format} · {t._count.teams}/{t.teamCount} teams · {t._count.matches} matches
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}

function SeriesList() {
  const series = useGetSeriesListQuery();
  return (
    <QueryBoundary query={series} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No series yet" hint="A series is a best-of contest between two of your teams." />}>
      {(list) => (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((s) => (
            <Link key={s.id} to={paths.app.series(s.id)} className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              <Card className="gap-2 py-4 transition-shadow hover:shadow-md">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{s.name}</p>
                    <Badge variant={s.status === 'live' ? 'live' : 'success'}>{s.status === 'live' ? 'In progress' : 'Completed'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.teamA.name} v {s.teamB.name} · best of {s.matchCount}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}

/** Tournaments and series in one place. Both need an account. */
export function EventsPage() {
  return (
    <>
      <PageHeader
        title="Tournaments & series"
        actions={
          <>
            <Button asChild>
              <Link to={paths.app.newTournament}>
                <Plus /> Tournament
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={paths.app.newSeries}>
                <Plus /> Series
              </Link>
            </Button>
          </>
        }
      />
      <Tabs defaultValue="tournaments">
        <TabsList>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
        <TabsContent value="tournaments">
          <TournamentList />
        </TabsContent>
        <TabsContent value="series">
          <SeriesList />
        </TabsContent>
      </Tabs>
    </>
  );
}
