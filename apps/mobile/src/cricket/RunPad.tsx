import { Pressable, StyleSheet, View } from 'react-native';
import { Text, colors, radius, space } from '@/ui';

export type ExtraKind = 'wide' | 'noBall' | 'bye' | 'legBye';

export interface RunPadProps {
  disabled?: boolean;
  canUndo: boolean;
  allowByes: boolean;
  allowLegByes: boolean;
  onRuns: (runs: number) => void;
  onExtra: (kind: ExtraKind) => void;
  onWicket: () => void;
  onUndo: () => void;
  onSwap: () => void;
}

function Key({ label, onPress, tone = 'plain', disabled, flex = 1 }: { label: string; onPress: () => void; tone?: 'plain' | 'boundary' | 'extra' | 'wicket' | 'util'; disabled?: boolean; flex?: number }) {
  const bg = tone === 'boundary' ? colors.primary : tone === 'wicket' ? colors.danger : tone === 'extra' ? colors.warningSoft : tone === 'util' ? colors.bg : colors.white;
  const fg = tone === 'boundary' || tone === 'wicket' ? colors.white : tone === 'extra' ? colors.warning : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.key, { flex, backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}
    >
      <Text variant="title" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function RunPad(p: RunPadProps) {
  const d = p.disabled;
  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        {[0, 1, 2, 3].map((r) => (
          <Key key={r} label={String(r)} disabled={d} onPress={() => p.onRuns(r)} />
        ))}
      </View>
      <View style={styles.row}>
        <Key label="4" tone="boundary" disabled={d} onPress={() => p.onRuns(4)} />
        <Key label="6" tone="boundary" disabled={d} onPress={() => p.onRuns(6)} />
        <Key label="W" tone="wicket" disabled={d} onPress={p.onWicket} />
        <Key label="Undo" tone="util" disabled={!p.canUndo} onPress={p.onUndo} />
      </View>
      <View style={styles.row}>
        <Key label="Wd" tone="extra" disabled={d} onPress={() => p.onExtra('wide')} />
        <Key label="Nb" tone="extra" disabled={d} onPress={() => p.onExtra('noBall')} />
        <Key label="Bye" tone="extra" disabled={d || !p.allowByes} onPress={() => p.onExtra('bye')} />
        <Key label="LB" tone="extra" disabled={d || !p.allowLegByes} onPress={() => p.onExtra('legBye')} />
      </View>
      <View style={styles.row}>
        <Key label="Swap strike" tone="util" disabled={d} onPress={p.onSwap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  key: {
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
