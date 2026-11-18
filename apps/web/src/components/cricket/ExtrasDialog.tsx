import { useState } from 'react';
import type { Intent } from '@cricket/client-core';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { ExtraKind } from './RunPad';

const COPY: Record<ExtraKind, { title: string; hint: string; min: number }> = {
  wide: { title: 'Wide', hint: 'Extra runs run, besides the wide itself', min: 0 },
  noBall: { title: 'No ball', hint: 'Runs scored on the no ball, besides the no ball itself', min: 0 },
  bye: { title: 'Byes', hint: 'Byes run', min: 1 },
  legBye: { title: 'Leg byes', hint: 'Leg byes run', min: 1 },
};

export interface ExtrasDialogProps {
  kind: ExtraKind | null;
  onClose: () => void;
  onConfirm: (intent: Intent) => void;
}

export function ExtrasDialog({ kind, onClose, onConfirm }: ExtrasDialogProps) {
  const [runs, setRuns] = useState<number | null>(null);
  const [from, setFrom] = useState<'bat' | 'bye' | 'legBye'>('bat');
  const c = kind ? COPY[kind] : null;
  const value = runs ?? c?.min ?? 0;

  const close = () => {
    setRuns(null);
    setFrom('bat');
    onClose();
  };
  const confirm = () => {
    if (!kind) return;
    const intent: Intent =
      kind === 'wide' ? { kind: 'wide', extraRuns: value }
      : kind === 'noBall' ? { kind: 'noBall', batRuns: value, from }
      : kind === 'bye' ? { kind: 'bye', runs: value }
      : { kind: 'legBye', runs: value };
    close();
    onConfirm(intent);
  };

  const options = c
    ? [0, 1, 2, 3, 4, 5, 6].filter((n) => n >= c.min && (kind === 'noBall' || n <= 4)).map((n) => ({ value: n, label: String(n) }))
    : [];

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c?.title}</DialogTitle>
          <DialogDescription>{c?.hint}</DialogDescription>
        </DialogHeader>
        <ChoiceGroup label="Runs" options={options} value={value} onChange={setRuns} />
        {kind === 'noBall' && value > 0 ? (
          <div className="space-y-2">
            <Label>Runs came from</Label>
            <ChoiceGroup
              label="Runs came from"
              options={[{ value: 'bat', label: 'Bat' }, { value: 'bye', label: 'Byes' }, { value: 'legBye', label: 'Leg byes' }] as const}
              value={from}
              onChange={setFrom}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={confirm}>Add {c?.title.toLowerCase()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
