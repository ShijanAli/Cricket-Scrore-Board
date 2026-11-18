import { Link, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/paths';
import { Brand } from './Brand';

/** Pages anyone can open: live scores, scorecards, tournament tables. */
export function PublicLayout() {
  const status = useAppSelector((s) => s.auth.status);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Brand />
          {status === 'signedIn' ? (
            <Button asChild size="sm">
              <Link to={paths.app.matches}>Dashboard</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link to={paths.login}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to={paths.register}>Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">Cricket Score · live scores for local cricket</footer>
    </div>
  );
}
