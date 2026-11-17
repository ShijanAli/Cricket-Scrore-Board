import { Pressable, StyleSheet } from 'react-native';
import { BottomSheet, Text, colors, radius, space } from '@/ui';

export interface PickablePlayer {
  id: string;
  name: string;
  /** Small line under the name, e.g. "12 (8)" or "2 overs". */
  note?: string;
}

export interface PlayerPickerProps {
  visible: boolean;
  title: string;
  players: readonly PickablePlayer[];
  onPick: (id: string) => void;
  /** Omit to make the sheet impossible to dismiss without choosing (e.g. a batter is required). */
  onClose?: () => void;
  emptyText?: string;
}

export function PlayerPicker({ visible, title, players, onPick, onClose, emptyText = 'No players available' }: PlayerPickerProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose ?? (() => undefined)}>
      {players.length === 0 ? <Text variant="muted">{emptyText}</Text> : null}
      {players.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => onPick(p.id)} style={styles.row}>
          <Text variant="body">{p.name}</Text>
          {p.note ? <Text variant="muted">{p.note}</Text> : null}
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: space.md,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
