import { useState } from 'react';
import { oversFromBalls } from '@cricket/engine';
import { playerNames, teamName, xiOf, type Intent, type MatchDetail } from '@cricket/client-core';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExtrasDialog } from '@/components/cricket/ExtrasDialog';
import { OverStrip } from '@/components/cricket/OverStrip';
import { PlayerPickerDialog } from '@/components/cricket/PlayerPickerDialog';
import { RunPad, type ExtraKind } from '@/components/cricket/RunPad';
import { ScoreHeader } from '@/components/cricket/ScoreHeader';
import { SyncBanner } from '@/components/cricket/SyncBanner';
import { WicketDialog, type PickablePlayer } from '@/components/cricket/WicketDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useScoring } from './useScoring';

export function ScoringView({ match, inningsNo }: { match: MatchDetail; inningsNo: number }) {
  const { controller, snapshot, lock } = useScoring(match, inningsNo);
  const { state } = snapshot;
  const nameOf = playerNames(match.players);
  const [extra, setExtra] = useState<ExtraKind | null>(null);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast.error('Cannot score that', { description: errorMessage(e) });
    }
  };
  const score = (intent: Intent) => void run(() => controller.dispatchIntent(intent));

  const blocked = lock === 'denied' || !!snapshot.rejected || state.status === 'completed';
  const battingXI = xiOf(match, state.battingTeamId);
  const bowlingXI = xiOf(match, state.bowlingTeamId);

  const newBatterChoices: PickablePlayer[] = battingXI.filter((p) => !state.batters[p.playerId]).map((p) => ({ id: p.playerId, name: p.player.name }));
  const newBowlerChoices: PickablePlayer[] = bowlingXI
    .filter((p) => p.playerId !== state.previousBowlerId)
    .map((p) => {
      const b = state.bowlers[p.playerId];
      return { id: p.playerId, name: p.player.name, note: b ? `${oversFromBalls(b.legalBalls, state.ballsPerOver)} ov` : undefined };
    });

  const striker = state.strikerId ? state.batters[state.strikerId] : undefined;
  const nonStriker = state.nonStrikerId ? state.batters[state.nonStrikerId] : undefined;
  const bowler = state.bowlerId ? state.bowlers[state.bowlerId] : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="space-y-4">
        <ScoreHeader teamName={teamName(match, state.battingTeamId)} state={state} />
        <SyncBanner
          snapshot={snapshot}
          lock={lock}
          onRetry={() => controller.retryRejected()}
          onDiscard={() => setDiscardOpen(true)}
          onUnlock={() => controller.clearLocked()}
        />

        <Card>
          <CardContent className="space-y-1.5 text-sm">
            {striker ? (
              <p className="font-semibold">
                🏏 {nameOf(striker.id)}* <span className="tabular-nums">{striker.runs} ({striker.balls})</span>
              </p>
            ) : null}
            {nonStriker ? (
              <p className="pl-6">
                {nameOf(nonStriker.id)} <span className="tabular-nums">{nonStriker.runs} ({nonStriker.balls})</span>
              </p>
            ) : null}
            {bowler ? (
              <p className="text-muted-foreground">
                ⚾ {nameOf(bowler.id)} {oversFromBalls(bowler.legalBalls, state.ballsPerOver)}-{bowler.maidens}-{bowler.runs}-{bowler.wickets}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Partnership {state.partnership.runs} ({state.partnership.balls})
            </p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">This over</h2>
          <OverStrip balls={state.thisOver} />
        </div>
      </div>

      <div className="space-y-4">
        {state.status === 'completed' ? (
          <Card>
            <CardContent className="space-y-3">
              <h2 className="text-lg font-semibold">Innings complete</h2>
              <p className="text-sm text-muted-foreground">
                {state.runs}/{state.wickets} in {oversFromBalls(state.legalBalls, state.ballsPerOver)} overs
              </p>
              <Button asChild>
                <Link to={paths.app.match(match.id)}>Back to match</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <RunPad
            disabled={blocked || state.needsNewBatter || state.needsNewBowler || !snapshot.ready}
            canUndo={snapshot.canUndo && !snapshot.rejected && lock !== 'denied'}
            allowByes={match.rules.allowByes}
            allowLegByes={match.rules.allowLegByes}
            onRuns={(runs) => score({ kind: 'runs', runs })}
            onExtra={setExtra}
            onWicket={() => setWicketOpen(true)}
            onUndo={() => void run(() => controller.undo())}
            onSwap={() => void run(() => controller.add({ type: 'strikeSwap' }))}
          />
        )}
      </div>

      <ExtrasDialog kind={extra} onClose={() => setExtra(null)} onConfirm={score} />
      <WicketDialog
        open={wicketOpen}
        striker={striker ? { id: striker.id, name: nameOf(striker.id) } : null}
        nonStriker={nonStriker ? { id: nonStriker.id, name: nameOf(nonStriker.id) } : null}
        fielders={bowlingXI.map((p) => ({ id: p.playerId, name: p.player.name }))}
        onClose={() => setWicketOpen(false)}
        onConfirm={(i) => {
          setWicketOpen(false);
          score(i);
        }}
      />
      <PlayerPickerDialog
        open={state.needsNewBatter && state.status !== 'completed' && !blocked}
        title="New batter"
        players={newBatterChoices}
        onPick={(batterId) => void run(() => controller.add({ type: 'batterIn', batterId }))}
        emptyText="No batters left in the XI"
      />
      <PlayerPickerDialog
        open={state.needsNewBowler && state.status !== 'completed' && !blocked}
        title="Next bowler"
        players={newBowlerChoices}
        onPick={(bowlerId) => void run(() => controller.add({ type: 'bowlerSelected', bowlerId }))}
      />
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard unsynced balls?"
        description="Balls the server refused will be removed from this browser, and the server score will be loaded."
        confirmLabel="Discard & reload"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          void run(() => controller.resetToServer());
        }}
      />
    </div>
  );
}
