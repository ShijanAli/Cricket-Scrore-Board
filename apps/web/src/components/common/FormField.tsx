import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FormFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> {
  control: Control<T, any, any>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  /** Turn the typed text into the stored value (e.g. '' -> undefined for optional fields). */
  parse?: (text: string) => unknown;
}

/** Label + input + validation message, wired to react-hook-form. Used by every form. */
export function FormField<T extends FieldValues>({ control, name, label, hint, parse, id, ...inputProps }: FormFieldProps<T>) {
  const fieldId = id ?? `f-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId}>{label}</Label>
          <Input
            {...inputProps}
            id={fieldId}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            onChange={(e) => field.onChange(parse ? parse(e.target.value) : e.target.value)}
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={fieldState.error ? `${fieldId}-error` : undefined}
          />
          {hint && !fieldState.error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          {fieldState.error ? (
            <p id={`${fieldId}-error`} role="alert" className="text-xs text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
