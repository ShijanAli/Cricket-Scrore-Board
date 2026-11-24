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

type Tone = 'plain' | 'four' | 'six' | 'extra' | 'wicket' | 'util';

const TONES: Record<Tone, string> = {
  plain: 'border-emerald-200 bg-white text-emerald-900 shadow-sm hover:border-emerald-400 hover:bg-emerald-50',
  four: 'border-transparent bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:brightness-110',
  six: 'border-transparent bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:brightness-110',
  extra: 'border-amber-300 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-900 hover:from-amber-200 hover:to-orange-200',
  wicket: 'border-transparent bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:brightness-110',
  util: 'border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300',
};

function Key({ label, onClick, tone = 'plain', disabled, className }: { label: string; onClick: () => void; tone?: Tone; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-16 select-none items-center justify-center rounded-2xl border-2 text-xl font-bold transition-colors active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
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
      <Key label="4" tone="four" disabled={d} onClick={() => p.onRuns(4)} />
      <Key label="6" tone="six" disabled={d} onClick={() => p.onRuns(6)} />
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
