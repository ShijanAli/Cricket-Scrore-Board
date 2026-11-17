import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { isFinished, isLive, nextStep, statusLabel, statusTone, teamName, type MatchDetail } from '@cricket/client-core';
import { ScoreHeader } from '@/cricket/ScoreHeader';
import { useMatch } from '@/hooks/queries';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { Badge, Button, Card, QueryBoundary, Screen, Text, space } from '@/ui';

const STEP_BUTTON = {
  xi: { label: 'Choose playing XI', path: 'xi' },
  toss: { label: 'Record toss', path: 'toss' },
  startInnings: { label: 'Start innings', path: 'start-innings' },
  score: { label: 'Continue scoring', path: 'score' },
} as const;

function Hub({ match }: { match: MatchDetail }) {
  const router = useRouter();
  const live = useLiveMatch(match.id, !isFinished(match.status));
  const step = nextStep(match);
  const go = (path: string) => router.push(`/match/${match.id}/${path}`);
  const status = live.status ?? match.status;

  return (
    <>
      <Stack.Screen options={{ title: `${teamName(match, match.teamAId)} v ${teamName(match, match.teamBId)}` }} />
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Badge label={statusLabel(status)} tone={statusTone(status)} />
        {isLive(status) ? <Badge label={live.connected ? 'Real-time' : 'Connecting…'} tone={live.connected ? 'success' : 'neutral'} /> : null}
      </View>

      {match.resultText ? (
        <Card style={{ backgroundColor: '#E3F4EB' }}>
          <Text variant="title">{match.resultText}</Text>
        </Card>
      ) : null}

      {[...match.innings].sort((x, y) => x.inningsNo - y.inningsNo).map((inn) => {
        const state = live.innings[inn.inningsNo] ?? inn.snapshot;
        return state ? <ScoreHeader key={inn.id} teamName={`${teamName(match, inn.battingTeamId)} · innings ${inn.inningsNo}`} state={state} /> : null;
      })}

      {step === 'waiting' ? <Text variant="muted">Teams will be decided after earlier matches finish.</Text> : null}
      {match.canScore && step !== 'done' && step !== 'waiting' ? (
        <Button title={STEP_BUTTON[step].label} onPress={() => go(STEP_BUTTON[step].path)} />
      ) : null}
      {match.canScore === false && step !== 'done' ? <Text variant="muted">You are viewing this match. Only the scorer can change it.</Text> : null}
      {match.innings.length > 0 ? <Button title="Full scorecard" variant="secondary" onPress={() => go('scorecard')} /> : null}
      {match.canScore && (step === 'toss' || step === 'startInnings') ? <Button title="Edit playing XI" variant="ghost" onPress={() => go('xi')} /> : null}
      {match.canScore && (match.status === 'scheduled' || match.status === 'toss') ? (
        <Button title="Set date & time" variant="ghost" onPress={() => go('schedule')} />
      ) : null}
      {match.tournamentId ? <Button title="Tournament" variant="ghost" onPress={() => router.push(`/tournament/${match.tournamentId}`)} /> : null}
      {match.seriesId ? <Button title="Series" variant="ghost" onPress={() => router.push(`/series/${match.seriesId}`)} /> : null}
    </>
  );
}

export default function MatchHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  return (
    <Screen>
      <QueryBoundary query={match}>{(m) => <Hub match={m} />}</QueryBoundary>
    </Screen>
  );
}
