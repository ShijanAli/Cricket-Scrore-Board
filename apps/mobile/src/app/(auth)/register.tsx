import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { registerSchema, type RegisterInput } from '@cricket/shared';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/query';
import { useAuth } from '@/state/auth';
import { Button, ErrorBanner, FormField, Screen, Text } from '@/ui';

export default function Register() {
  const { control, handleSubmit } = useForm<RegisterInput, any, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const reg = useMutation({
    mutationFn: (v: RegisterInput) => api.auth.register(v),
    onSuccess: (r) => useAuth.getState().signIn(r),
  });

  return (
    <Screen>
      <Text variant="heading">Create account</Text>
      <FormField control={control} name="name" label="Your name" autoComplete="name" />
      <FormField control={control} name="email" label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <FormField control={control} name="password" label="Password (min 8 characters)" secureTextEntry autoComplete="new-password" />
      {reg.isError ? <ErrorBanner message={errorMessage(reg.error)} /> : null}
      <Button title="Create account" loading={reg.isPending} onPress={handleSubmit((v) => reg.mutate(v))} />
    </Screen>
  );
}
