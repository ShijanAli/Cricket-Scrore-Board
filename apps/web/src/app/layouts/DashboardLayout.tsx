import { LogOut, Medal, Trophy, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useCurrentUser } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/authSlice';
import { paths } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { Brand } from './Brand';

const NAV = [
  { to: paths.app.matches, label: 'Matches', icon: Medal },
  { to: paths.app.teams, label: 'Teams', icon: Users },
  { to: paths.app.events, label: 'Tournaments', icon: Trophy },
] as const;

/** The organiser's workspace: matches, teams, tournaments and series. */
export function DashboardLayout() {
  const user = useCurrentUser();
  const dispatch = useAppDispatch();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand to={paths.app.matches} />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent', isActive && 'bg-accent text-accent-foreground')
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t p-3">
          <p className="truncate px-1 text-sm font-medium">{user?.name}</p>
          <p className="truncate px-1 text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void dispatch(signOut())}>
            <LogOut /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <Brand to={paths.app.matches} />
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => void dispatch(signOut())}>
            <LogOut />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-8">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card md:hidden" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to={paths.home} className="sr-only">
          Public site
        </Link>
      </div>
    </div>
  );
}
