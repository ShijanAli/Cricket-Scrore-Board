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
      <header className="bg-night sticky top-0 z-30 border-b border-white/10 shadow-lg shadow-emerald-950/20">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Brand light />
          {status === 'signedIn' ? (
            <Button asChild size="sm">
              <Link to={paths.app.matches}>Dashboard</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
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
      <footer className="bg-night py-5 text-center text-xs text-white/70">Cricket Score · live scores for local cricket</footer>
    </div>
  );
}
