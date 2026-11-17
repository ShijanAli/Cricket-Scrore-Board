import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, type LoginInput } from '@cricket/shared';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/query';
import { useAuth } from '@/state/auth';
import { Button, ErrorBanner, FormField, Screen, Text } from '@/ui';

export default function Login() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<LoginInput, any, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useMutation({
    mutationFn: (v: LoginInput) => api.auth.login(v),
    onSuccess: (r) => useAuth.getState().signIn(r),
  });

  return (
    <Screen contentStyle={{ paddingTop: 64 }}>
      <Text variant="heading">Cricket Score</Text>
      <Text variant="muted">Sign in to score matches and run tournaments.</Text>
      <FormField control={control} name="email" label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <FormField control={control} name="password" label="Password" secureTextEntry autoComplete="password" />
      {login.isError ? <ErrorBanner message={errorMessage(login.error)} /> : null}
      <Button title="Sign in" loading={login.isPending} onPress={handleSubmit((v) => login.mutate(v))} />
      <Button title="Create an account" variant="ghost" onPress={() => router.push('/register')} />
    </Screen>
  );
}
