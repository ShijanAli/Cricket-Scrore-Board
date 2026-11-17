import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { xiOf, type MatchDetail } from '@cricket/client-core';
import { useNavigate, useParams } from 'react-router-dom';
import { XiPicker } from '@/components/cricket/XiPicker';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, Spinner } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { useGetTeamQuery } from '@/features/teams/teamsApi';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useGetMatchQuery, useSetPlayingXIMutation } from './matchesApi';

function XiForm({ match }: { match: MatchDetail }) {
  const navigate = useNavigate();
  const [save, { isLoading }] = useSetPlayingXIMutation();
  const teamA = useGetTeamQuery(match.teamAId ?? skipToken);
  const teamB = useGetTeamQuery(match.teamBId ?? skipToken);
  const teamIds = [match.teamAId, match.teamBId].filter((x): x is string => !!x);
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(teamIds.map((t) => [t, xiOf(match, t).map((p) => p.playerId)])),
  );
  const [error, setError] = useState<string | null>(null);

  const squads = [teamA.data, teamB.data].filter((t): t is NonNullable<typeof t> => !!t);
  if (squads.length < teamIds.length) return <Spinner />;
  const max = match.rules.playersPerSide;
  const ready = teamIds.every((t) => (picked[t]?.length ?? 0) >= 2);

  const submit = async () => {
    setError(null);
    for (const teamId of teamIds) {
      const res = await save({ matchId: match.id, input: { teamId, playerIds: picked[teamId] ?? [] } });
      if (res.error) return setError(errorMessage(res.error));
    }
    navigate(paths.app.match(match.id));
  };

  return (
    <div className="space-y-4">
      {squads.map((team) => (
        <XiPicker
          key={team.id}
          team={team}
          squad={team.roster}
          selected={picked[team.id] ?? []}
          max={max}
          onChange={(ids) => {
            setError(null);
            setPicked((p) => ({ ...p, [team.id]: ids }));
          }}
        />
      ))}
      {error ? <ErrorState message={error} /> : null}
      <Button size="lg" disabled={!ready || isLoading} onClick={() => void submit()}>
        {isLoading ? 'Saving…' : 'Save playing XIs'}
      </Button>
    </div>
  );
}

export function XiPage() {
  const { id = '' } = useParams();
  const match = useGetMatchQuery(id);
  return (
    <>
      <PageHeader title="Playing XI" backTo={paths.app.match(id)} />
      <QueryBoundary query={match}>{(m) => <XiForm match={m} />}</QueryBoundary>
    </>
  );
}
