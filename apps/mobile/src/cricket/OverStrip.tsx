import { StyleSheet, View } from 'react-native';
import type { BallLog } from '@cricket/shared';
import { Text, colors } from '@/ui';

const tone = (b: BallLog) =>
  b.isWicket ? { bg: colors.danger, fg: colors.white } : b.totalRuns >= 4 ? { bg: colors.primary, fg: colors.white } : !b.legal ? { bg: colors.warningSoft, fg: colors.warning } : { bg: colors.white, fg: colors.text };

/** The balls of the current over, newest last. */
export function OverStrip({ balls }: { balls: readonly BallLog[] }) {
  if (balls.length === 0) return <Text variant="muted">New over</Text>;
  return (
    <View style={styles.row}>
      {balls.map((b) => {
        const t = tone(b);
        return (
          <View key={b.eventId} style={[styles.ball, { backgroundColor: t.bg }]}>
            <Text variant="label" style={{ color: t.fg, fontSize: 12 }}>
              {b.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ball: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
