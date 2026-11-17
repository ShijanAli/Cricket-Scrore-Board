import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { TextField, type TextFieldProps } from './TextField';

export interface FormFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> {
  control: Control<T, any, any>;
  name: FieldPath<T>;
  /** Parse the typed text into the form value. Default: the text itself. Use Number for numeric fields. */
  parse?: (text: string) => unknown;
}

/** A text input wired to react-hook-form. Validation messages come from the shared zod schema. */
export function FormField<T extends FieldValues>({ control, name, parse, ...rest }: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          value={field.value === undefined || field.value === null ? '' : String(field.value)}
          onChangeText={(t) => field.onChange(parse ? parse(t) : t)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
