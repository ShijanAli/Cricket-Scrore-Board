import type {
  AddSquadPlayerInput,
  CreatePlayerInput,
  CreateSeriesInput,
  CreateSingleMatchInput,
  CreateNoticeInput,
  CreateTournamentInput,
  PauseTournamentInput,
  ResumeTournamentInput,
  UpdateTournamentInput,
  CreateTeamInput,
  IngestEventsInput,
  InningsSetup,
  LoginInput,
  PlayingXIInput,
  RegisterInput,
  ScheduleMatchInput,
  TossInput,
  UpdateTeamInput,
} from '@cricket/shared';
import type { ApiClient } from './client';
import type {
  AuthResult,
  EventsResult,
  IngestResult,
  MatchDetail,
  MatchSummary,
  Page,
  Player,
  SeriesAwards,
  SeriesDetail,
  SeriesListItem,
  StandingRowDto,
  SquadMember,
  Team,
  TeamListItem,
  TeamWithRoster,
  TournamentDetail,
  TournamentEntry,
  TournamentListItem,
  TournamentNotice,
  User,
} from './types';

/** Every endpoint in one place. Screens and hooks call these, never `fetch`. Inputs use the shared zod types. */
export function createApi(c: ApiClient) {
  return {
    auth: {
      register: (input: RegisterInput) => c.post<AuthResult>('/auth/register', input, { auth: false }),
      login: (input: LoginInput) => c.post<AuthResult>('/auth/login', input, { auth: false }),
      me: () => c.get<{ user: User }>('/auth/me').then((r) => r.user),
      logout: (refreshToken: string) => c.post<void>('/auth/logout', { refreshToken }, { auth: false }),
    },
    teams: {
      list: () => c.get<{ teams: TeamListItem[] }>('/teams').then((r) => r.teams),
      get: (id: string) => c.get<{ team: TeamWithRoster }>(`/teams/${id}`).then((r) => r.team),
      create: (input: CreateTeamInput) => c.post<{ team: Team }>('/teams', input).then((r) => r.team),
      update: (id: string, input: UpdateTeamInput) => c.patch<{ team: Team }>(`/teams/${id}`, input).then((r) => r.team),
      remove: (id: string) => c.delete(`/teams/${id}`),
      addPlayer: (id: string, input: AddSquadPlayerInput) =>
        c.post<{ member: SquadMember }>(`/teams/${id}/players`, input).then((r) => r.member),
      removePlayer: (id: string, playerId: string) => c.delete(`/teams/${id}/players/${playerId}`),
    },
    players: {
      list: (q?: string) => c.get<{ players: Player[] }>('/players', { query: { q } }).then((r) => r.players),
      create: (input: CreatePlayerInput) => c.post<{ player: Player }>('/players', input).then((r) => r.player),
    },
    tournaments: {
      list: () => c.get<{ tournaments: TournamentListItem[] }>('/tournaments').then((r) => r.tournaments),
      get: (id: string) => c.get<{ tournament: TournamentDetail }>(`/tournaments/${id}`, { auth: false }).then((r) => r.tournament),
      create: (input: CreateTournamentInput) =>
        c.post<{ tournament: { id: string } }>('/tournaments', input).then((r) => r.tournament),
      addTeam: (id: string, teamId: string, seed?: number) =>
        c.post<{ entry: TournamentEntry }>(`/tournaments/${id}/teams`, { teamId, seed }).then((r) => r.entry),
      removeTeam: (id: string, teamId: string) => c.delete(`/tournaments/${id}/teams/${teamId}`),
      addScorer: (id: string, email: string) =>
        c.post<{ scorer: { userId: string; name: string } }>(`/tournaments/${id}/scorers`, { email }).then((r) => r.scorer),
      generateFixtures: (id: string) =>
        c.post<{ fixtures: MatchSummary[] }>(`/tournaments/${id}/fixtures`).then((r) => r.fixtures),
      fixtures: (id: string) =>
        c.get<{ fixtures: MatchSummary[] }>(`/tournaments/${id}/fixtures`, { auth: false }).then((r) => r.fixtures),
      update: (id: string, input: UpdateTournamentInput) =>
        c.patch<{ tournament: TournamentDetail; updatedMatches: number }>(`/tournaments/${id}`, input),
      pause: (id: string, input: PauseTournamentInput) => c.post<{ notice: TournamentNotice }>(`/tournaments/${id}/pause`, input),
      resume: (id: string, input: ResumeTournamentInput) => c.post<{ notice: TournamentNotice }>(`/tournaments/${id}/resume`, input),
      notices: (id: string) =>
        c.get<{ notices: TournamentNotice[] }>(`/tournaments/${id}/notices`, { auth: false }).then((r) => r.notices),
      addNotice: (id: string, input: CreateNoticeInput) =>
        c.post<{ notice: TournamentNotice }>(`/tournaments/${id}/notices`, input).then((r) => r.notice),
      resolveNotice: (id: string, noticeId: string) =>
        c.post<{ notice: TournamentNotice }>(`/tournaments/${id}/notices/${noticeId}/resolve`).then((r) => r.notice),
      setGroups: (id: string, assignments: { teamId: string; group: string | null }[]) =>
        c.put<{ teams: TournamentEntry[] }>(`/tournaments/${id}/groups`, { assignments }).then((r) => r.teams),
      awards: (id: string) => c.get<{ awards: SeriesAwards }>(`/tournaments/${id}/awards`, { auth: false }).then((r) => r.awards),
      standings: (id: string) =>
        c.get<{ standings: StandingRowDto[] }>(`/tournaments/${id}/standings`, { auth: false }).then((r) => r.standings),
    },
    series: {
      list: () => c.get<{ series: SeriesListItem[] }>('/series').then((r) => r.series),
      get: (id: string) => c.get<{ series: SeriesDetail }>(`/series/${id}`, { auth: false }).then((r) => r.series),
      awards: (id: string) => c.get<{ awards: SeriesAwards }>(`/series/${id}/awards`, { auth: false }).then((r) => r.awards),
      create: (input: CreateSeriesInput) => c.post<{ series: { id: string } }>('/series', input).then((r) => r.series),
    },
    matches: {
      list: (page = 1) => c.get<Page<MatchSummary>>('/matches', { query: { page, pageSize: 20 } }),
      live: () => c.get<{ matches: MatchSummary[] }>('/matches/live', { auth: false }).then((r) => r.matches),
      get: (id: string) => c.get<{ match: MatchDetail }>(`/matches/${id}`).then((r) => r.match),
      createSingle: (input: CreateSingleMatchInput) =>
        c.post<{ match: MatchDetail }>('/matches', input).then((r) => r.match),
      setPlayingXI: (id: string, input: PlayingXIInput) =>
        c.put<{ match: MatchDetail }>(`/matches/${id}/playing-xi`, input).then((r) => r.match),
      toss: (id: string, input: TossInput) =>
        c.post<{ match: MatchDetail }>(`/matches/${id}/toss`, input).then((r) => r.match),
      startInnings: (id: string, input: InningsSetup) =>
        c.post<{ match: MatchDetail }>(`/matches/${id}/innings`, input).then((r) => r.match),
      ingestEvents: (id: string, input: IngestEventsInput) => c.post<IngestResult>(`/matches/${id}/events`, input),
      listEvents: (id: string, inningsNo: number, afterSeq = 0) =>
        c.get<EventsResult>(`/matches/${id}/events`, { query: { inningsNo, afterSeq }, auth: false }),
      schedule: (id: string, input: ScheduleMatchInput) =>
        c.patch<{ match: MatchDetail }>(`/matches/${id}/schedule`, input).then((r) => r.match),
      lockScorer: (id: string) => c.post<{ scorerUserId: string }>(`/matches/${id}/scorer/lock`),
      releaseScorer: (id: string) => c.delete(`/matches/${id}/scorer/lock`),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
