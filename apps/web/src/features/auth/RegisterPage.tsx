import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@cricket/shared';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useRegisterMutation } from './authApi';

export function RegisterPage() {
  const [register, { isLoading, error }] = useRegisterMutation();
  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>Needed for tournaments and series. Single matches work for everyone you share the link with.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => void register(v))}>
          <FormField control={control} name="name" label="Your name" autoComplete="name" />
          <FormField control={control} name="email" label="Email" type="email" autoComplete="email" />
          <FormField control={control} name="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" />
          {error ? <ErrorState message={errorMessage(error)} /> : null}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to={paths.login} className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
