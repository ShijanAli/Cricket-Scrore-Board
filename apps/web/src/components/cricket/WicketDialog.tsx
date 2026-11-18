import { useMemo, useState } from 'react';
import type { Intent } from '@cricket/client-core';
import { NO_BALL_VALID_WICKETS, WICKET_TYPES, WIDE_VALID_WICKETS, ZERO_RUN_WICKETS, type WicketType } from '@cricket/shared';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { NumberStepper } from '@/components/common/NumberStepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const LABEL: Record<WicketType, string> = {
  bowled: 'Bowled', caught: 'Caught', lbw: 'LBW', runOut: 'Run out', stumped: 'Stumped',
  hitWicket: 'Hit wicket', obstructingField: 'Obstructing', hitBallTwice: 'Hit twice', handledBall: 'Handled ball',
};
const NEEDS_FIELDER: readonly WicketType[] = ['caught', 'stumped', 'runOut'];

export interface PickablePlayer {
  id: string;
  name: string;
  note?: string;
}

export interface WicketDialogProps {
  open: boolean;
  striker: PickablePlayer | null;
  nonStriker: PickablePlayer | null;
  fielders: readonly PickablePlayer[];
  onClose: () => void;
  onConfirm: (intent: Intent) => void;
}

export function WicketDialog({ open, striker, nonStriker, fielders, onClose, onConfirm }: WicketDialogProps) {
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
    setBall('none');
    setType('bowled');
    setOutId(null);
    setFielderId(null);
    setRuns(0);
  };
  const close = () => {
    reset();
    onClose();
  };
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
    <Dialog open={open && striker !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wicket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ball</Label>
            <ChoiceGroup
              label="Ball"
              options={[{ value: 'none', label: 'Normal' }, { value: 'wide', label: 'Wide' }, { value: 'noBall', label: 'No ball' }] as const}
              value={ball}
              onChange={setBall}
            />
          </div>
          <div className="space-y-2">
            <Label>How out</Label>
            <ChoiceGroup label="How out" options={allowed.map((w) => ({ value: w, label: LABEL[w] }))} value={current} onChange={setType} />
          </div>
          {isRunOut && striker && nonStriker ? (
            <div className="space-y-2">
              <Label>Who is out</Label>
              <ChoiceGroup
                label="Who is out"
                options={[{ value: striker.id, label: striker.name }, { value: nonStriker.id, label: nonStriker.name }]}
                value={out ?? striker.id}
                onChange={setOutId}
              />
            </div>
          ) : null}
          {NEEDS_FIELDER.includes(current) && fielders.length > 0 ? (
            <div className="space-y-2">
              <Label>Fielder (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {fielders.map((f) => (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={fielderId === f.id ? 'default' : 'outline'}
                    onClick={() => setFielderId(fielderId === f.id ? null : f.id)}
                  >
                    {f.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {!zeroRuns ? <NumberStepper label="Runs completed" value={runs} min={0} max={3} onChange={setRuns} /> : null}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={confirm}>
            Confirm wicket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
