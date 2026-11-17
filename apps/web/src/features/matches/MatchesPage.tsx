import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MatchCard } from '@/components/cricket/MatchCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/paths';
import { useGetMatchesQuery } from './matchesApi';

export function MatchesPage() {
  const [page, setPage] = useState(1);
  const matches = useGetMatchesQuery(page);
  const newMatch = (
    <Button asChild>
      <Link to={paths.app.newMatch}>
        <Plus /> New match
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader title="Matches" description="Single matches and tournament fixtures you can score." actions={newMatch} />
      <QueryBoundary
        query={matches}
        isEmpty={(d) => d.items.length === 0 && page === 1}
        empty={<EmptyState title="No matches yet" hint="Start a friendly match, or create a tournament." action={newMatch} />}
      >
        {(data) => {
          const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.items.map((m) => (
                  <MatchCard key={m.id} match={m} mode="app" />
                ))}
              </div>
              {pages > 1 ? (
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
