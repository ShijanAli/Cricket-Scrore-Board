import { LogOut, Medal, Trophy, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useCurrentUser } from '@/app/hooks';
import { CricketBall, Stumps } from '@/components/art/CricketArt';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/authSlice';
import { paths } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { Brand } from './Brand';

const NAV = [
  { to: paths.app.matches, label: 'Matches', icon: Medal, tile: 'from-emerald-400 to-teal-500' },
  { to: paths.app.teams, label: 'Teams', icon: Users, tile: 'from-sky-400 to-indigo-500' },
  { to: paths.app.events, label: 'Tournaments', icon: Trophy, tile: 'from-amber-400 to-orange-500' },
] as const;

/** The organiser's workspace: matches, teams, tournaments and series. */
export function DashboardLayout() {
  const user = useCurrentUser();
  const dispatch = useAppDispatch();
  const initial = (user?.name?.trim()[0] ?? '?').toUpperCase();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-night sticky top-0 hidden h-screen w-64 shrink-0 flex-col text-white shadow-xl md:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Brand to={paths.app.matches} light />
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 p-3" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, tile }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white',
                  isActive && 'bg-white/15 text-white shadow-inner ring-1 ring-white/20',
                )
              }
            >
              <span className={cn('flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md', tile)}>
                <Icon className="size-4" />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="pointer-events-none relative mx-auto -mb-2 flex items-end gap-2 opacity-60">
          <Stumps className="h-24 w-[4.5rem]" />
          <CricketBall className="mb-1 size-9" />
        </div>
        <div className="m-3 space-y-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 text-base font-bold shadow-lg">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-white/60">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={() => void dispatch(signOut())}>
            <LogOut /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-night sticky top-0 z-30 flex h-14 items-center justify-between px-4 shadow-md md:hidden">
          <Brand to={paths.app.matches} light />
          <Button variant="ghost" size="icon" aria-label="Log out" className="text-white hover:bg-white/10 hover:text-white" onClick={() => void dispatch(signOut())}>
            <LogOut />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>
        <nav className="bg-night fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 rounded-t-2xl px-2 pt-1.5 pb-1 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.35)] md:hidden" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, tile }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-1.5 text-xs font-semibold', isActive ? 'text-white' : 'text-white/55')}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex size-8 items-center justify-center rounded-xl transition-all', isActive ? cn('bg-gradient-to-br shadow-lg', tile) : 'bg-transparent')}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
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
