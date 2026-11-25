import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { TeamBadge } from '@/components/common/TeamBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paths } from '@/lib/paths';
import { teamsApi, useGetTeamsQuery } from './teamsApi';

export function TeamsPage() {
  const teams = useGetTeamsQuery();
  const prefetchTeam = teamsApi.usePrefetch('getTeam');
  const newTeam = (
    <Button asChild>
      <Link to={paths.app.newTeam}>
        <Plus /> New team
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader title="Teams" description="Your squads. Use them in matches, tournaments and series." actions={newTeam} />
      <QueryBoundary
        query={teams}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No teams yet" hint="Create a team and add its players." action={newTeam} />}
      >
        {(list) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((t) => (
              <Link key={t.id} to={paths.app.team(t.id)} onPointerEnter={() => prefetchTeam(t.id, { ifOlderThan: 30 })} onFocus={() => prefetchTeam(t.id, { ifOlderThan: 30 })} className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <Card className="py-4 transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <TeamBadge shortName={t.shortName} color={t.color} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t._count.roster} players</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
