import { isFinished, isLive, nextStep, teamName, type MatchDetail } from '@cricket/client-core';
import { Link, useParams } from 'react-router-dom';
import { ScoreHeader } from '@/components/cricket/ScoreHeader';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWatchedMatch } from '@/features/live/useLiveMatch';
import { paths } from '@/lib/paths';

const STEP_BUTTON = {
  xi: { label: 'Choose playing XI', step: 'xi' },
  toss: { label: 'Record toss', step: 'toss' },
  startInnings: { label: 'Start innings', step: 'start-innings' },
  score: { label: 'Continue scoring', step: 'score' },
} as const;

function Hub({ match, connected }: { match: MatchDetail; connected: boolean }) {
  const step = nextStep(match);
  const live = isLive(match.status);
  const go = (s: Parameters<typeof paths.app.matchStep>[1]) => paths.app.matchStep(match.id, s);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={match.status} />
        {live ? <Badge variant={connected ? 'success' : 'secondary'}>{connected ? 'Real-time' : 'Updating every few seconds'}</Badge> : null}
      </div>

      {match.resultText ? (
        <Card className="bg-primary/10">
          <CardContent>
            <p className="text-lg font-semibold">{match.resultText}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {[...match.innings]
          .sort((x, y) => x.inningsNo - y.inningsNo)
          .map((inn) =>
            inn.snapshot ? <ScoreHeader key={inn.id} teamName={`${teamName(match, inn.battingTeamId)} · innings ${inn.inningsNo}`} state={inn.snapshot} /> : null,
          )}
      </div>

      {step === 'waiting' ? <p className="text-sm text-muted-foreground">Teams will be decided after earlier matches finish.</p> : null}
      {match.canScore === false && step !== 'done' ? <p className="text-sm text-muted-foreground">You are viewing this match. Only the scorer can change it.</p> : null}

      <div className="flex flex-wrap gap-2">
        {match.canScore && step !== 'done' && step !== 'waiting' ? (
          <Button asChild size="lg">
            <Link to={go(STEP_BUTTON[step].step)}>{STEP_BUTTON[step].label}</Link>
          </Button>
        ) : null}
        {match.innings.length > 0 ? (
          <Button asChild variant="outline" size="lg">
            <Link to={go('scorecard')}>Full scorecard</Link>
          </Button>
        ) : null}
        {match.canScore && (step === 'toss' || step === 'startInnings') ? (
          <Button asChild variant="ghost" size="lg">
            <Link to={go('xi')}>Edit playing XI</Link>
          </Button>
        ) : null}
        {match.canScore && (match.status === 'scheduled' || match.status === 'toss') ? (
          <Button asChild variant="ghost" size="lg">
            <Link to={go('schedule')}>Set date &amp; time</Link>
          </Button>
        ) : null}
        {match.tournamentId ? (
          <Button asChild variant="ghost" size="lg">
            <Link to={paths.app.tournament(match.tournamentId)}>Tournament</Link>
          </Button>
        ) : null}
        {match.seriesId ? (
          <Button asChild variant="ghost" size="lg">
            <Link to={paths.app.series(match.seriesId)}>Series</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="lg">
          <Link to={paths.publicMatch(match.id)}>Public page</Link>
        </Button>
      </div>
    </div>
  );
}

export function MatchHubPage() {
  const { id = '' } = useParams();
  const { query, connected } = useWatchedMatch(id);
  const m = query.data;
  const back = m?.tournamentId ? paths.app.tournament(m.tournamentId) : m?.seriesId ? paths.app.series(m.seriesId) : paths.app.matches;
  return (
    <>
      <PageHeader
        title={m ? `${teamName(m, m.teamAId)} v ${teamName(m, m.teamBId)}` : 'Match'}
        description={m && !isFinished(m.status) && m.ground ? m.ground : undefined}
        backTo={back}
      />
      <QueryBoundary query={query}>{(match) => <Hub match={match} connected={connected} />}</QueryBoundary>
    </>
  );
}
