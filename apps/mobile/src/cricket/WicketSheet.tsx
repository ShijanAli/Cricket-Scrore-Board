import { useMemo, useState } from 'react';
import {
  NO_BALL_VALID_WICKETS,
  WICKET_TYPES,
  WIDE_VALID_WICKETS,
  ZERO_RUN_WICKETS,
  type WicketType,
} from '@cricket/shared';
import { BottomSheet, Button, Chip, NumberStepper, Segmented, Text } from '@/ui';
import type { Intent } from '@/features/scoring/intents';
import type { PickablePlayer } from './PlayerPicker';

const LABEL: Record<WicketType, string> = {
  bowled: 'Bowled', caught: 'Caught', lbw: 'LBW', runOut: 'Run out', stumped: 'Stumped',
  hitWicket: 'Hit wicket', obstructingField: 'Obstructing', hitBallTwice: 'Hit twice', handledBall: 'Handled ball',
};
const NEEDS_FIELDER: readonly WicketType[] = ['caught', 'stumped', 'runOut'];

export interface WicketSheetProps {
  visible: boolean;
  striker: PickablePlayer | null;
  nonStriker: PickablePlayer | null;
  fielders: readonly PickablePlayer[];
  onClose: () => void;
  onConfirm: (intent: Intent) => void;
}

export function WicketSheet({ visible, striker, nonStriker, fielders, onClose, onConfirm }: WicketSheetProps) {
  const [ball, setBall] = useState<'none' | 'wide' | 'noBall'>('none');
  const [type, setType] = useState<WicketType>('bowled');
  const [outId, setOutId] = useState<string | null>(null);
  const [fielderId, setFielderId] = useState<string | null>(null);
  const [runs, setRuns] = useState(0);

  const allowed = useMemo(
    () => (ball === 'wide' ? WIDE_VALID_WICKETS : ball === 'noBall' ? NO_BALL_VALID_WICKETS : WICKET_TYPES.values),
    [ball],
  );
  const current: WicketType = allowed.includes(type) ? type : (allowed[0] as WicketType);
  const zeroRuns = ZERO_RUN_WICKETS.includes(current);
  const isRunOut = current === 'runOut';
  const out = isRunOut ? (outId ?? striker?.id ?? null) : (striker?.id ?? null);

  const reset = () => {
    setBall('none'); setType('bowled'); setOutId(null); setFielderId(null); setRuns(0);
  };
  const close = () => {
    reset();
    onClose();
  };
  if (!visible || !striker) return null;

  const confirm = () => {
    if (!out) return;
    const intent: Intent = {
      kind: 'wicket',
      runs: zeroRuns ? 0 : runs,
      extra: ball,
      wicket: { type: current, playerOutId: out, ...(NEEDS_FIELDER.includes(current) && fielderId ? { fielderId } : {}) },
    };
    reset();
    onConfirm(intent);
  };

  return (
    <BottomSheet visible title="Wicket" onClose={close}>
      <Text variant="label">Ball</Text>
      <Segmented
        options={[{ value: 'none', label: 'Normal' }, { value: 'wide', label: 'Wide' }, { value: 'noBall', label: 'No ball' }] as const}
        value={ball}
        onChange={setBall}
      />
      <Text variant="label">How out</Text>
      <Segmented options={allowed.map((w) => ({ value: w, label: LABEL[w] }))} value={current} onChange={setType} />
      {isRunOut && nonStriker ? (
        <>
          <Text variant="label">Who is out</Text>
          <Segmented
            options={[{ value: striker.id, label: striker.name }, { value: nonStriker.id, label: nonStriker.name }]}
            value={out ?? striker.id}
            onChange={setOutId}
          />
        </>
      ) : null}
      {NEEDS_FIELDER.includes(current) && fielders.length > 0 ? (
        <>
          <Text variant="label">Fielder (optional)</Text>
          {fielders.map((f) => (
            <Chip key={f.id} label={f.name} selected={fielderId === f.id} onPress={() => setFielderId(fielderId === f.id ? null : f.id)} />
          ))}
        </>
      ) : null}
      {!zeroRuns ? <NumberStepper label="Runs completed" value={runs} min={0} max={3} onChange={setRuns} /> : null}
      <Button title="Confirm wicket" variant="danger" onPress={confirm} />
    </BottomSheet>
  );
}
