import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, space } from './theme';

type Tone = 'neutral' | 'success' | 'live' | 'warning';

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.border, fg: colors.text },
  success: { bg: colors.primarySoft, fg: colors.primaryDark },
  live: { bg: colors.dangerSoft, fg: colors.live },
  warning: { bg: colors.warningSoft, fg: colors.warning },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text variant="muted" style={{ color: t.fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
