import { useState } from 'react';
import { teamName, type MatchDetail } from '@cricket/client-core';
import type { TossDecision } from '@cricket/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useGetMatchQuery, useRecordTossMutation } from './matchesApi';

function TossForm({ match }: { match: MatchDetail }) {
  const navigate = useNavigate();
  const [recordToss, { isLoading, error }] = useRecordTossMutation();
  const [winner, setWinner] = useState<string | null>(match.tossWinnerId);
  const [decision, setDecision] = useState<TossDecision>(match.tossDecision ?? 'bat');
  const teams = [match.teamAId, match.teamBId].filter((x): x is string => !!x);

  const submit = async () => {
    if (!winner) return;
    const res = await recordToss({ matchId: match.id, input: { winnerTeamId: winner, decision } });
    if (!res.error) navigate(paths.app.match(match.id));
  };

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-base">Who won the toss?</Label>
          <ChoiceGroup label="Toss winner" options={teams.map((t) => ({ value: t, label: teamName(match, t) }))} value={winner} onChange={setWinner} />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Elected to</Label>
          <ChoiceGroup label="Decision" options={[{ value: 'bat', label: 'Bat' }, { value: 'bowl', label: 'Bowl' }] as const} value={decision} onChange={setDecision} />
        </div>
        {error ? <ErrorState message={errorMessage(error)} /> : null}
        <Button size="lg" disabled={!winner || isLoading} onClick={() => void submit()}>
          {isLoading ? 'Saving…' : 'Save toss'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TossPage() {
  const { id = '' } = useParams();
  const match = useGetMatchQuery(id);
  return (
    <>
      <PageHeader title="Toss" backTo={paths.app.match(id)} />
      <QueryBoundary query={match}>{(m) => <TossForm match={m} />}</QueryBoundary>
    </>
  );
}
