import { StyleSheet, View } from 'react-native';
import { oversFromBalls, runRate } from '@cricket/engine';
import type { InningsState } from '@cricket/shared';
import { Card, Text, colors, space } from '@/ui';

export interface ScoreHeaderProps {
  teamName: string;
  state: InningsState;
}

/** Big score line: runs/wickets, overs, run rate and (second innings) what is needed. */
export function ScoreHeader({ teamName, state }: ScoreHeaderProps) {
  const overs = oversFromBalls(state.legalBalls, state.ballsPerOver);
  const crr = runRate(state.runs, state.legalBalls, state.ballsPerOver);
  const ballsLeft = state.maxBalls - state.legalBalls;
  const need = state.target !== null ? Math.max(0, state.target - state.runs) : null;
  return (
    <Card style={styles.card}>
      <Text variant="muted">{teamName}</Text>
      <View style={styles.row}>
        <Text variant="score">
          {state.runs}/{state.wickets}
        </Text>
        <Text variant="title" style={styles.overs}>
          ({overs} ov)
        </Text>
      </View>
      <Text variant="muted">CRR {crr.toFixed(2)}</Text>
      {need !== null ? (
        <Text variant="label" style={{ color: colors.primaryDark }}>
          Need {need} from {ballsLeft} {ballsLeft === 1 ? 'ball' : 'balls'} · Target {state.target}
        </Text>
      ) : null}
      {state.freeHit ? (
        <Text variant="label" style={{ color: colors.warning }}>
          FREE HIT
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  overs: { marginBottom: 6 },
});
