import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { colors, radius, space } from './theme';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text variant="error">{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" compact onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.center}>
      <Text variant="title">{title}</Text>
      {hint ? (
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {hint}
        </Text>
      ) : null}
      {action ? <Button title={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, gap: space.sm },
});
