import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@cricket/shared';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useLoginMutation } from './authApi';

export function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  // On success the auth state flips and GuestRoute redirects, so there is nothing to do here.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Manage your teams, tournaments and live scoring.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => void login(v))}>
          <FormField control={control} name="email" label="Email" type="email" autoComplete="email" />
          <FormField control={control} name="password" label="Password" type="password" autoComplete="current-password" />
          {error ? <ErrorState message={errorMessage(error)} /> : null}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in…' : 'Log in'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to={paths.register} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
