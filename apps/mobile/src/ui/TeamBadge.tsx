import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

/** Round team marker: the team colour with its short name. */
export function TeamBadge({ shortName, color, size = 40 }: { shortName: string; color?: string; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.primary }]}>
      <Text variant="label" style={{ color: colors.white, fontSize: size * 0.3 }}>
        {shortName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ badge: { alignItems: 'center', justifyContent: 'center' } });
