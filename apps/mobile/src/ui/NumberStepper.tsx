import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, space } from './theme';

export interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

export function NumberStepper({ label, value, min, max, onChange }: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.row}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <View style={styles.stepper}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={dec} disabled={value <= min} style={[styles.btn, value <= min && styles.off]}>
          <Text variant="title">−</Text>
        </Pressable>
        <Text variant="title" style={styles.value}>
          {value}
        </Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={inc} disabled={value >= max} style={[styles.btn, value >= max && styles.off]}>
          <Text variant="title">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  value: { minWidth: 36, textAlign: 'center' },
});
