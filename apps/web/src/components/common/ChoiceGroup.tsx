import { cn } from '@/lib/utils';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface Base<T extends string | number> {
  options: readonly Choice<T>[];
  label?: string;
  className?: string;
}

/** Pick one option (segmented buttons). Replaces a <select> for short lists, and works well on touch screens. */
export function ChoiceGroup<T extends string | number>({ options, value, onChange, label, className }: Base<T> & { value: T | null; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <ChoiceButton key={String(o.value)} selected={value === o.value} disabled={o.disabled} role="radio" onClick={() => onChange(o.value)}>
          {o.label}
        </ChoiceButton>
      ))}
    </div>
  );
}

/** Pick many options (chips). */
export function MultiChoiceGroup<T extends string | number>({ options, value, onChange, label, className }: Base<T> & { value: readonly T[]; onChange: (v: T[]) => void }) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <ChoiceButton key={String(o.value)} selected={value.includes(o.value)} disabled={o.disabled} role="checkbox" onClick={() => toggle(o.value)}>
          {o.label}
        </ChoiceButton>
      ))}
    </div>
  );
}

export function ChoiceButton({
  selected,
  role,
  className,
  ...props
}: React.ComponentProps<'button'> & { selected: boolean; role?: 'radio' | 'checkbox' }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        selected ? 'border-transparent bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/25' : 'border-emerald-200 bg-white hover:bg-emerald-50',
        className,
      )}
      {...props}
    />
  );
}
