import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { paths } from '@/lib/paths';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { PublicLayout } from './layouts/PublicLayout';

/** Pages load on demand, so a spectator never downloads the scoring screen. */
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T & string): RouteObject['lazy'] =>
  async () => ({ Component: (await load())[name] });

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, lazy: page(() => import('@/pages/public/HomePage'), 'HomePage') },
      { path: 'm/:id', lazy: page(() => import('@/pages/public/PublicMatchPage'), 'PublicMatchPage') },
      { path: 't/:id', lazy: page(() => import('@/pages/public/PublicTournamentPage'), 'PublicTournamentPage') },
      { path: 's/:id', lazy: page(() => import('@/pages/public/PublicSeriesPage'), 'PublicSeriesPage') },
    ],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', lazy: page(() => import('@/features/auth/LoginPage'), 'LoginPage') },
          { path: 'register', lazy: page(() => import('@/features/auth/RegisterPage'), 'RegisterPage') },
        ],
      },
    ],
  },
  {
    path: 'app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to={paths.app.matches} replace /> },
          { path: 'matches', lazy: page(() => import('@/features/matches/MatchesPage'), 'MatchesPage') },
          { path: 'matches/new', lazy: page(() => import('@/features/matches/NewMatchPage'), 'NewMatchPage') },
          { path: 'teams', lazy: page(() => import('@/features/teams/TeamsPage'), 'TeamsPage') },
          { path: 'teams/new', lazy: page(() => import('@/features/teams/NewTeamPage'), 'NewTeamPage') },
          { path: 'teams/:id', lazy: page(() => import('@/features/teams/TeamDetailPage'), 'TeamDetailPage') },
          { path: 'events', lazy: page(() => import('@/features/tournaments/EventsPage'), 'EventsPage') },
          { path: 'tournaments/new', lazy: page(() => import('@/features/tournaments/NewTournamentPage'), 'NewTournamentPage') },
          { path: 'tournaments/:id', lazy: page(() => import('@/features/tournaments/TournamentPage'), 'TournamentPage') },
          { path: 'series/new', lazy: page(() => import('@/features/series/NewSeriesPage'), 'NewSeriesPage') },
          { path: 'series/:id', lazy: page(() => import('@/features/series/SeriesPage'), 'SeriesPage') },
          { path: 'match/:id', lazy: page(() => import('@/features/matches/MatchHubPage'), 'MatchHubPage') },
          { path: 'match/:id/xi', lazy: page(() => import('@/features/matches/XiPage'), 'XiPage') },
          { path: 'match/:id/toss', lazy: page(() => import('@/features/matches/TossPage'), 'TossPage') },
          { path: 'match/:id/start-innings', lazy: page(() => import('@/features/matches/StartInningsPage'), 'StartInningsPage') },
          { path: 'match/:id/schedule', lazy: page(() => import('@/features/matches/SchedulePage'), 'SchedulePage') },
          { path: 'match/:id/scorecard', lazy: page(() => import('@/features/matches/ScorecardPage'), 'ScorecardPage') },
          { path: 'match/:id/score', lazy: page(() => import('@/features/scoring/ScoringPage'), 'ScoringPage') },
        ],
      },
    ],
  },
  { path: '*', lazy: page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
];

export const router = createBrowserRouter(routes);
