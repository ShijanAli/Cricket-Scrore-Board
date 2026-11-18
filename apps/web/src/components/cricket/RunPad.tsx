import { cn } from '@/lib/utils';

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

type Tone = 'plain' | 'boundary' | 'extra' | 'wicket' | 'util';

const TONES: Record<Tone, string> = {
  plain: 'bg-card hover:bg-accent',
  boundary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent',
  extra: 'bg-warning/15 text-warning hover:bg-warning/25',
  wicket: 'bg-destructive text-white hover:bg-destructive/90 border-transparent',
  util: 'bg-muted hover:bg-accent',
};

function Key({ label, onClick, tone = 'plain', disabled, className }: { label: string; onClick: () => void; tone?: Tone; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-16 select-none items-center justify-center rounded-lg border text-xl font-semibold transition-colors active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
        TONES[tone],
        className,
      )}
    >
      {label}
    </button>
  );
}

/** The scoring keys. Big, touch friendly, and identical in behaviour to the mobile pad. */
export function RunPad(p: RunPadProps) {
  const d = p.disabled;
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {[0, 1, 2, 3].map((r) => (
        <Key key={r} label={String(r)} disabled={d} onClick={() => p.onRuns(r)} />
      ))}
      <Key label="4" tone="boundary" disabled={d} onClick={() => p.onRuns(4)} />
      <Key label="6" tone="boundary" disabled={d} onClick={() => p.onRuns(6)} />
      <Key label="W" tone="wicket" disabled={d} onClick={p.onWicket} />
      <Key label="Undo" tone="util" disabled={!p.canUndo} onClick={p.onUndo} />
      <Key label="Wd" tone="extra" disabled={d} onClick={() => p.onExtra('wide')} />
      <Key label="Nb" tone="extra" disabled={d} onClick={() => p.onExtra('noBall')} />
      <Key label="Bye" tone="extra" disabled={d || !p.allowByes} onClick={() => p.onExtra('bye')} />
      <Key label="LB" tone="extra" disabled={d || !p.allowLegByes} onClick={() => p.onExtra('legBye')} />
      <Key label="Swap strike" tone="util" disabled={d} onClick={p.onSwap} className="col-span-4 h-12 text-base" />
    </div>
  );
}
