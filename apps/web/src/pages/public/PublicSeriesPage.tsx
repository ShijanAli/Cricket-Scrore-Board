import { useParams } from 'react-router-dom';
import { SeriesView } from '@/components/cricket/SeriesView';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { useGetSeriesQuery } from '@/features/series/seriesApi';
import { paths } from '@/lib/paths';

export function PublicSeriesPage() {
  const { id = '' } = useParams();
  const series = useGetSeriesQuery(id, { pollingInterval: 30_000, skipPollingIfUnfocused: true });
  return (
    <>
      <PageHeader title={series.data?.name ?? 'Series'} backTo={paths.home} />
      <QueryBoundary query={series}>{(s) => <SeriesView series={s} mode="public" />}</QueryBoundary>
    </>
  );
}
