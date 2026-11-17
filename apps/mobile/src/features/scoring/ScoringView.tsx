import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { oversFromBalls } from '@cricket/engine';
import type { MatchDetail } from '@/api/types';
import { ExtrasSheet } from '@/cricket/ExtrasSheet';
import { OverStrip } from '@/cricket/OverStrip';
import { PlayerPicker, type PickablePlayer } from '@/cricket/PlayerPicker';
import { RunPad, type ExtraKind } from '@/cricket/RunPad';
import { ScoreHeader } from '@/cricket/ScoreHeader';
import { WicketSheet } from '@/cricket/WicketSheet';
import { playerNames, teamName, xiOf } from '@/cricket/match-utils';
import { errorMessage } from '@/lib/query';
import { Badge, Button, Card, Screen, Text, colors, space } from '@/ui';
import type { Intent } from './intents';
import { useScoring } from './useScoring';

export function ScoringView({ match, inningsNo }: { match: MatchDetail; inningsNo: number }) {
  const router = useRouter();
  const { controller, snapshot, lock } = useScoring(match, inningsNo);
  const { state } = snapshot;
  const nameOf = playerNames(match.players);
  const [extra, setExtra] = useState<ExtraKind | null>(null);
  const [wicketOpen, setWicketOpen] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Cannot score that', errorMessage(e));
    }
  };
  const score = (intent: Intent) => void run(() => controller.dispatchIntent(intent));

  const blocked = lock === 'denied' || !!snapshot.rejected || state.status === 'completed';
  const battingXI = xiOf(match, state.battingTeamId);
  const bowlingXI = xiOf(match, state.bowlingTeamId);
  const pick = (ids: readonly string[]): PickablePlayer[] => ids.map((id) => ({ id, name: nameOf(id) }));

  const newBatterChoices = battingXI.filter((p) => !state.batters[p.playerId]).map((p) => ({ id: p.playerId, name: p.player.name }));
  const newBowlerChoices: PickablePlayer[] = bowlingXI
    .filter((p) => p.playerId !== state.previousBowlerId)
    .map((p) => {
      const b = state.bowlers[p.playerId];
      return { id: p.playerId, name: p.player.name, note: b ? `${oversFromBalls(b.legalBalls, state.ballsPerOver)} ov` : undefined };
    });

  const striker = state.strikerId ? state.batters[state.strikerId] : undefined;
  const nonStriker = state.nonStrikerId ? state.batters[state.nonStrikerId] : undefined;
  const bowler = state.bowlerId ? state.bowlers[state.bowlerId] : undefined;

  const discard = () =>
    Alert.alert('Discard unsynced balls?', 'Balls the server refused will be removed from this phone, and the server score will be loaded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard & reload', style: 'destructive', onPress: () => void run(async () => void (await controller.resetToServer())) },
    ]);

  return (
    <Screen>
      <ScoreHeader teamName={teamName(match, state.battingTeamId)} state={state} />

      <SyncBar snapshot={snapshot} lock={lock} onRetry={() => controller.retryRejected()} onDiscard={discard} onUnlock={() => controller.clearLocked()} />

      <Card style={{ gap: space.sm }}>
        {striker ? <Text variant="label">🏏 {nameOf(striker.id)}*  {striker.runs} ({striker.balls})</Text> : null}
        {nonStriker ? <Text variant="body">    {nameOf(nonStriker.id)}  {nonStriker.runs} ({nonStriker.balls})</Text> : null}
        {bowler ? (
          <Text variant="muted">
            ⚾ {nameOf(bowler.id)}  {oversFromBalls(bowler.legalBalls, state.ballsPerOver)}-{bowler.maidens}-{bowler.runs}-{bowler.wickets}
          </Text>
        ) : null}
        <Text variant="muted">Partnership {state.partnership.runs} ({state.partnership.balls})</Text>
      </Card>

      <Text variant="label">This over</Text>
      <OverStrip balls={state.thisOver} />

      {state.status === 'completed' ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="title">Innings complete</Text>
          <Text variant="muted">
            {state.runs}/{state.wickets} in {oversFromBalls(state.legalBalls, state.ballsPerOver)} overs
          </Text>
          <Button title="Back to match" onPress={() => router.replace(`/match/${match.id}`)} />
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

      <ExtrasSheet kind={extra} onClose={() => setExtra(null)} onConfirm={score} />
      <WicketSheet
        visible={wicketOpen}
        striker={striker ? { id: striker.id, name: nameOf(striker.id) } : null}
        nonStriker={nonStriker ? { id: nonStriker.id, name: nameOf(nonStriker.id) } : null}
        fielders={pick(bowlingXI.map((p) => p.playerId))}
        onClose={() => setWicketOpen(false)}
        onConfirm={(i) => {
          setWicketOpen(false);
          score(i);
        }}
      />

      <PlayerPicker
        visible={state.needsNewBatter && state.status !== 'completed' && !blocked}
        title="New batter"
        players={newBatterChoices}
        onPick={(batterId) => void run(() => controller.add({ type: 'batterIn', batterId }))}
        emptyText="No batters left in the XI"
      />
      <PlayerPicker
        visible={state.needsNewBowler && state.status !== 'completed' && !blocked}
        title="Next bowler"
        players={newBowlerChoices}
        onPick={(bowlerId) => void run(() => controller.add({ type: 'bowlerSelected', bowlerId }))}
      />
    </Screen>
  );
}

function SyncBar({
  snapshot,
  lock,
  onRetry,
  onDiscard,
  onUnlock,
}: {
  snapshot: ReturnType<typeof useScoring>['snapshot'];
  lock: ReturnType<typeof useScoring>['lock'];
  onRetry: () => void;
  onDiscard: () => void;
  onUnlock: () => void;
}) {
  if (snapshot.rejected) {
    return (
      <Card style={{ backgroundColor: colors.dangerSoft, gap: space.sm }}>
        <Text variant="label" style={{ color: colors.danger }}>Server refused a ball</Text>
        <Text variant="muted">{snapshot.rejected.message}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Retry" variant="secondary" compact onPress={onRetry} />
          <Button title="Discard & reload" variant="danger" compact onPress={onDiscard} />
        </View>
      </Card>
    );
  }
  if (lock === 'denied' || snapshot.locked) {
    return (
      <Card style={{ backgroundColor: colors.warningSoft, gap: space.sm }}>
        <Text variant="label" style={{ color: colors.warning }}>Another scorer is scoring this match</Text>
        <Text variant="muted">Your balls stay saved on this phone.</Text>
        {snapshot.locked ? <Button title="Try again" variant="secondary" compact onPress={onUnlock} /> : null}
      </Card>
    );
  }
  if (snapshot.pending > 0) {
    return <Badge tone="warning" label={snapshot.offline ? `Offline · ${snapshot.pending} to sync` : `Syncing ${snapshot.pending}…`} />;
  }
  return <Badge tone="success" label={snapshot.offline ? 'Offline' : 'All synced'} />;
}
