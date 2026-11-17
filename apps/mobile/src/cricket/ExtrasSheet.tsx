import { useState } from 'react';
import { BottomSheet, Button, Segmented, Text } from '@/ui';
import type { Intent } from '@/features/scoring/intents';
import type { ExtraKind } from './RunPad';

const COPY: Record<ExtraKind, { title: string; hint: string; min: number }> = {
  wide: { title: 'Wide', hint: 'Extra runs run, besides the wide itself', min: 0 },
  noBall: { title: 'No ball', hint: 'Runs scored on the no ball, besides the no ball itself', min: 0 },
  bye: { title: 'Byes', hint: 'Byes run', min: 1 },
  legBye: { title: 'Leg byes', hint: 'Leg byes run', min: 1 },
};

export interface ExtrasSheetProps {
  kind: ExtraKind | null;
  onClose: () => void;
  onConfirm: (intent: Intent) => void;
}

export function ExtrasSheet({ kind, onClose, onConfirm }: ExtrasSheetProps) {
  const [runs, setRuns] = useState<number | null>(null);
  const [from, setFrom] = useState<'bat' | 'bye' | 'legBye'>('bat');
  if (!kind) return null;
  const c = COPY[kind];
  const value = runs ?? c.min;
  const options = [0, 1, 2, 3, 4, 5, 6].filter((n) => n >= c.min && (kind === 'noBall' || n <= 4)).map((n) => ({ value: n, label: String(n) }));
  const close = () => {
    setRuns(null);
    setFrom('bat');
    onClose();
  };
  const confirm = () => {
    const intent: Intent =
      kind === 'wide' ? { kind: 'wide', extraRuns: value }
      : kind === 'noBall' ? { kind: 'noBall', batRuns: value, from }
      : kind === 'bye' ? { kind: 'bye', runs: value }
      : { kind: 'legBye', runs: value };
    close();
    onConfirm(intent);
  };
  return (
    <BottomSheet visible title={c.title} onClose={close}>
      <Text variant="muted">{c.hint}</Text>
      <Segmented options={options} value={value} onChange={setRuns} />
      {kind === 'noBall' && value > 0 ? (
        <>
          <Text variant="label">Runs came from</Text>
          <Segmented
            options={[{ value: 'bat', label: 'Bat' }, { value: 'bye', label: 'Byes' }, { value: 'legBye', label: 'Leg byes' }] as const}
            value={from}
            onChange={setFrom}
          />
        </>
      ) : null}
      <Button title={`Add ${c.title.toLowerCase()}`} onPress={confirm} />
    </BottomSheet>
  );
}
