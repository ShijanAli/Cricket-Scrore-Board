import { groupByStage } from '@cricket/client-core';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { useGetFixturesQuery, useGetStandingsQuery } from '@/features/tournaments/tournamentsApi';
import type { LinkMode } from '@/lib/paths';
import { AwardsCard } from './AwardsCard';
import { FixtureRow } from './FixtureRow';
import { StandingsTable } from './StandingsTable';

export function FixturesList({ id, mode }: { id: string; mode: LinkMode }) {
  const fixtures = useGetFixturesQuery(id);
  return (
    <QueryBoundary query={fixtures} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No fixtures yet" hint="Fixtures appear once all teams have joined." />}>
      {(list) => (
        <div className="space-y-6">
          {groupByStage(list).map((g) => (
            <section key={g.stage} className="space-y-3">
              <h3 className="font-semibold">{g.label}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {g.matches.map((m) => (
                  <FixtureRow key={m.id} match={m} mode={mode} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}

export function StandingsView({ id }: { id: string }) {
  const standings = useGetStandingsQuery(id);
  return (
    <QueryBoundary query={standings} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No table yet" hint="The table appears once teams are added." />}>
      {(rows) => <StandingsTable rows={rows} />}
    </QueryBoundary>
  );
}

export const TournamentAwards = ({ id }: { id: string }) => <AwardsCard scope="tournament" id={id} />;
