import { ArrowRight, BarChart3, Share2, Trophy, WifiOff, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CricketBall, CricketScene, FieldBackdrop } from '@/components/art/CricketArt';
import { MatchCard } from '@/components/cricket/MatchCard';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/app/hooks';
import { useGetLiveMatchesQuery } from '@/features/matches/matchesApi';
import { paths } from '@/lib/paths';

const FEATURES: { icon: ReactNode; title: string; text: string; tile: string }[] = [
  { icon: <Zap className="size-5" />, title: 'Ball-by-ball scoring', text: 'Fast run pad, extras, wickets and undo. Every ball is saved, so the scorecard is always right.', tile: 'from-amber-400 to-orange-500' },
  { icon: <Trophy className="size-5" />, title: 'Tournaments & series', text: 'League, group stage, knockouts or best-of series, with fixtures and points table made for you.', tile: 'from-fuchsia-500 to-pink-500' },
  { icon: <WifiOff className="size-5" />, title: 'Works offline', text: 'Poor signal at the ground? Keep scoring. Balls sync automatically when you are back online.', tile: 'from-sky-400 to-indigo-500' },
  { icon: <Share2 className="size-5" />, title: 'One link to share', text: 'Friends and family follow the live score in their browser. No app, no login.', tile: 'from-emerald-400 to-teal-500' },
  { icon: <BarChart3 className="size-5" />, title: 'Scorecards & awards', text: 'Full scorecards, net run rate, standings and player awards after every match.', tile: 'from-violet-500 to-purple-600' },
];

const STEPS = [
  { n: '1', title: 'Create', text: 'Add your teams and set up a match, tournament or series.' },
  { n: '2', title: 'Score', text: 'Pick the playing XI, do the toss and tap each ball.' },
  { n: '3', title: 'Share', text: 'Send the link. Everyone follows live, ball by ball.' },
];

export function HomePage() {
  const live = useGetLiveMatchesQuery(undefined, { pollingInterval: 15_000, skipPollingIfUnfocused: true });
  const signedIn = useAppSelector((s) => s.auth.status) === 'signedIn';
  const liveCount = live.data?.length ?? 0;

  return (
    <div className="space-y-14 pb-6">
      {/* hero */}
      <section className="relative overflow-hidden bg-brand rounded-3xl px-6 py-14 text-white shadow-2xl shadow-teal-900/25 sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -top-20 left-1/3 size-72 rounded-full bg-lime-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 size-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <FieldBackdrop className="pointer-events-none absolute inset-0 size-full opacity-80 [mask-image:linear-gradient(to_left,black_35%,transparent_85%)]" />
        <CricketBall className="animate-spin-slow pointer-events-none absolute top-6 right-8 size-14 opacity-90 drop-shadow-xl sm:size-20" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex size-2">
              <span className={`absolute inline-flex size-full rounded-full bg-red-400 ${liveCount > 0 ? 'animate-ping' : 'hidden'}`} />
              <span className={`relative inline-flex size-2 rounded-full ${liveCount > 0 ? 'bg-red-400' : 'bg-white/60'}`} />
            </span>
            {liveCount > 0 ? `${liveCount} live ${liveCount === 1 ? 'match' : 'matches'} right now` : 'Live scores for local cricket'}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Live cricket scores,
            <br />
            <span className="bg-gradient-to-r from-yellow-200 via-lime-200 to-emerald-100 bg-clip-text text-transparent">from your own ground</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            Score a match, run a tournament or a series, and share one link so everyone can follow ball by ball.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="shadow-md">
              <Link to={signedIn ? paths.app.matches : paths.register}>
                {signedIn ? 'Open dashboard' : 'Start scoring'}
                <ArrowRight />
              </Link>
            </Button>
            {!signedIn ? (
              <Button asChild size="lg" variant="ghost" className="border border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link to={paths.login}>Log in</Link>
              </Button>
            ) : null}
          </div>
          </div>
          <CricketScene className="mx-auto hidden w-full max-w-xl drop-shadow-2xl lg:block" />
        </div>
      </section>

      {/* live now */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-gradient text-3xl font-extrabold tracking-tight">Live now</h2>
          {liveCount > 0 ? (
            <span className="animate-pulse rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-3 py-0.5 text-xs font-bold text-white shadow shadow-rose-500/40">{liveCount} LIVE</span>
          ) : null}
        </div>
        <QueryBoundary
          query={live}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState title="No live matches right now" hint="Matches show up here the moment scoring starts." />}
        >
          {(list) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} mode="public" />
              ))}
            </div>
          )}
        </QueryBoundary>
      </section>

      {/* features */}
      <section className="space-y-6">
        <div className="max-w-xl">
          <h2 className="text-gradient text-3xl font-extrabold tracking-tight">Everything a local league needs</h2>
          <p className="mt-1 text-muted-foreground">From a weekend friendly to a full tournament, in one simple app.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-white bg-white p-5 shadow-md shadow-emerald-900/5 transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-110 group-hover:-rotate-3 ${f.tile}`}>
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="space-y-6">
        <h2 className="text-gradient text-3xl font-extrabold tracking-tight">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4 rounded-2xl bg-brand-soft p-5 ring-1 ring-emerald-200/70">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-sm font-bold text-white shadow-md">{s.n}</span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* closing call to action */}
      {!signedIn ? (
        <section className="flex flex-col items-start justify-between gap-4 bg-night relative overflow-hidden rounded-3xl p-8 text-white shadow-xl sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Ready to score your next match?</h2>
            <p className="mt-1 text-sm text-white/75">Free to start. Create an account and be live in minutes.</p>
          </div>
          <Button asChild size="lg">
            <Link to={paths.register}>
              Create free account
              <ArrowRight />
            </Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
