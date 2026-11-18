import { useState } from 'react';
import { inningsSides, teamName, xiOf, type MatchDetail } from '@cricket/client-core';
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
import { useGetMatchQuery, useStartInningsMutation } from './matchesApi';

function Setup({ match }: { match: MatchDetail }) {
  const navigate = useNavigate();
  const [startInnings, { isLoading, error }] = useStartInningsMutation();
  const inningsNo = match.currentInningsNo + 1;
  const sides = inningsSides(match, inningsNo);
  const [striker, setStriker] = useState<string | null>(null);
  const [nonStriker, setNonStriker] = useState<string | null>(null);
  const [bowler, setBowler] = useState<string | null>(null);
  if (!sides) return <p className="text-muted-foreground">Record the toss first.</p>;

  const batters = xiOf(match, sides.batting);
  const bowlers = xiOf(match, sides.bowling);
  const ready = !!striker && !!nonStriker && !!bowler;

  const submit = async () => {
    if (!striker || !nonStriker || !bowler) return;
    const res = await startInnings({
      matchId: match.id,
      input: { battingTeamId: sides.batting, bowlingTeamId: sides.bowling, strikerId: striker, nonStrikerId: nonStriker, bowlerId: bowler },
    });
    if (!res.error) navigate(paths.app.matchStep(match.id, 'score'), { replace: true });
  };

  const group = (title: string, list: typeof batters, value: string | null, set: (v: string) => void, disabledId?: string | null) => (
    <div className="space-y-2">
      <Label className="text-base">{title}</Label>
      <ChoiceGroup
        label={title}
        options={list.map((p) => ({ value: p.playerId, label: p.player.name, disabled: p.playerId === disabledId }))}
        value={value}
        onChange={set}
      />
    </div>
  );

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Innings {inningsNo}: {teamName(match, sides.batting)} bat, {teamName(match, sides.bowling)} bowl
        </p>
        {group('Striker', batters, striker, setStriker, nonStriker)}
        {group('Non-striker', batters, nonStriker, setNonStriker, striker)}
        {group('Opening bowler', bowlers, bowler, setBowler)}
        {error ? <ErrorState message={errorMessage(error)} /> : null}
        <Button size="lg" disabled={!ready || isLoading} onClick={() => void submit()}>
          {isLoading ? 'Starting…' : 'Start innings'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function StartInningsPage() {
  const { id = '' } = useParams();
  const match = useGetMatchQuery(id);
  return (
    <>
      <PageHeader title="Start innings" backTo={paths.app.match(id)} />
      <QueryBoundary query={match}>{(m) => <Setup match={m} />}</QueryBoundary>
    </>
  );
}
