import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { useGetMatchQuery } from '@/features/matches/matchesApi';
import { paths } from '@/lib/paths';
import { ScoringView } from './ScoringView';

export function ScoringPage() {
  const { id = '' } = useParams();
  const match = useGetMatchQuery(id);
  return (
    <>
      <PageHeader title="Scoring" backTo={paths.app.match(id)} />
      <QueryBoundary query={match}>
        {(m) => {
          const current = m.innings.find((i) => i.inningsNo === m.currentInningsNo);
          if (!current) return <EmptyState title="Innings not started" hint="Start the innings from the match page." />;
          if (m.canScore === false) return <EmptyState title="View only" hint="Only the match scorer can score." />;
          // key = fresh controller per innings
          return <ScoringView key={`${m.id}:${current.inningsNo}`} match={m} inningsNo={current.inningsNo} />;
        }}
      </QueryBoundary>
    </>
  );
}
