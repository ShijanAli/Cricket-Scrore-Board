import { teamName } from '@cricket/client-core';
import { useParams } from 'react-router-dom';
import { MatchScoreboard } from '@/components/cricket/MatchScoreboard';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { useWatchedMatch } from '@/features/live/useLiveMatch';
import { paths } from '@/lib/paths';

export function ScorecardPage() {
  const { id = '' } = useParams();
  const { query } = useWatchedMatch(id);
  const m = query.data;
  return (
    <>
      <PageHeader title={m ? `${teamName(m, m.teamAId)} v ${teamName(m, m.teamBId)}` : 'Scorecard'} description={m?.resultText ?? undefined} backTo={paths.app.match(id)} />
      <QueryBoundary query={query}>{(match) => <MatchScoreboard match={match} />}</QueryBoundary>
    </>
  );
}
