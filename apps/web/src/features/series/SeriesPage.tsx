import { useParams } from 'react-router-dom';
import { SeriesView } from '@/components/cricket/SeriesView';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/paths';
import { useGetSeriesQuery } from './seriesApi';

export function SeriesPage() {
  const { id = '' } = useParams();
  const series = useGetSeriesQuery(id);
  return (
    <>
      <PageHeader
        title={series.data?.name ?? 'Series'}
        backTo={paths.app.events}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={paths.publicSeries(id)} target="_blank" rel="noreferrer">
              Public page
            </a>
          </Button>
        }
      />
      <QueryBoundary query={series}>{(s) => <SeriesView series={s} mode="app" />}</QueryBoundary>
    </>
  );
}
