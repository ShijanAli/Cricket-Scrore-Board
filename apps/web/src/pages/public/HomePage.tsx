import { Link } from 'react-router-dom';
import { MatchCard } from '@/components/cricket/MatchCard';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/app/hooks';
import { useGetLiveMatchesQuery } from '@/features/matches/matchesApi';
import { paths } from '@/lib/paths';

export function HomePage() {
  const live = useGetLiveMatchesQuery(undefined, { pollingInterval: 15_000, skipPollingIfUnfocused: true });
  const signedIn = useAppSelector((s) => s.auth.status) === 'signedIn';
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-primary px-6 py-10 text-primary-foreground">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Live cricket scores, from your own ground</h1>
        <p className="mt-2 max-w-xl text-primary-foreground/85">
          Follow local matches ball by ball. Score a match, run a tournament or a series, and share one link with everyone.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to={signedIn ? paths.app.matches : paths.register}>{signedIn ? 'Open dashboard' : 'Start scoring'}</Link>
          </Button>
          {!signedIn ? (
            <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to={paths.login}>Log in</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Live now</h2>
        <QueryBoundary
          query={live}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState title="No live matches right now" hint="Matches show up here the moment scoring starts." />}
        >
          {(list) => (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} mode="public" />
              ))}
            </div>
          )}
        </QueryBoundary>
      </section>
    </div>
  );
}
