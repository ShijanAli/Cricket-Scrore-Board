import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}

export function NumberStepper({ label, value, min, max, onChange, hint }: NumberStepperProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - 1)}>
          <Minus />
        </Button>
        <span className="min-w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button type="button" variant="outline" size="icon" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + 1)}>
          <Plus />
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
