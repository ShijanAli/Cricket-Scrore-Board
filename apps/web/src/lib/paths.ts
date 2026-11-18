/** Every URL in one place, so links never drift from the router. */
export const paths = {
  home: '/',
  login: '/login',
  register: '/register',
  // public viewers (no login)
  publicMatch: (id: string) => `/m/${id}`,
  publicTournament: (id: string) => `/t/${id}`,
  publicSeries: (id: string) => `/s/${id}`,
  // organiser dashboard
  app: {
    root: '/app',
    matches: '/app/matches',
    newMatch: '/app/matches/new',
    teams: '/app/teams',
    newTeam: '/app/teams/new',
    team: (id: string) => `/app/teams/${id}`,
    events: '/app/events',
    newTournament: '/app/tournaments/new',
    tournament: (id: string) => `/app/tournaments/${id}`,
    newSeries: '/app/series/new',
    series: (id: string) => `/app/series/${id}`,
    match: (id: string) => `/app/match/${id}`,
    matchStep: (id: string, step: 'xi' | 'toss' | 'start-innings' | 'score' | 'schedule' | 'scorecard') =>
      `/app/match/${id}/${step}`,
  },
} as const;

/** Where a fixture row should link: the public page for viewers, the hub for organisers. */
export type LinkMode = 'public' | 'app';
export const matchHref = (mode: LinkMode, id: string) => (mode === 'public' ? paths.publicMatch(id) : paths.app.match(id));
export const tournamentHref = (mode: LinkMode, id: string) => (mode === 'public' ? paths.publicTournament(id) : paths.app.tournament(id));
export const seriesHref = (mode: LinkMode, id: string) => (mode === 'public' ? paths.publicSeries(id) : paths.app.series(id));
