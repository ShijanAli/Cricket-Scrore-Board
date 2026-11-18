import type { CreateNoticeInput, CreateTournamentInput, PauseTournamentInput, ResumeTournamentInput, UpdateTournamentInput } from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';

export const tournamentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getTournaments: b.query({
      queryFn: (_: void) => call(() => api.tournaments.list()),
      providesTags: ['Tournaments'],
    }),
    getTournament: b.query({
      queryFn: (id: string) => call(() => api.tournaments.get(id)),
      providesTags: (_r, _e, id) => [{ type: 'Tournament', id }],
    }),
    getTournamentAwards: b.query({
      queryFn: (id: string) => call(() => api.tournaments.awards(id)),
      providesTags: (_r, _e, id) => [{ type: 'Standings', id }, { type: 'Tournament', id }],
    }),
    setGroups: b.mutation({
      queryFn: ({ id, assignments }: { id: string; assignments: { teamId: string; group: string | null }[] }) =>
        call(() => api.tournaments.setGroups(id, assignments)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }],
    }),
    getFixtures: b.query({
      queryFn: (id: string) => call(() => api.tournaments.fixtures(id)),
      providesTags: (_r, _e, id) => [{ type: 'Fixtures', id }],
    }),
    getStandings: b.query({
      queryFn: (id: string) => call(() => api.tournaments.standings(id)),
      providesTags: (_r, _e, id) => [{ type: 'Standings', id }],
    }),
    createTournament: b.mutation({
      queryFn: (input: CreateTournamentInput) => call(() => api.tournaments.create(input)),
      invalidatesTags: ['Tournaments'],
    }),
    addTournamentTeam: b.mutation({
      queryFn: ({ id, teamId }: { id: string; teamId: string }) => call(() => api.tournaments.addTeam(id, teamId)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }, 'Tournaments', { type: 'Standings', id }],
    }),
    removeTournamentTeam: b.mutation({
      queryFn: ({ id, teamId }: { id: string; teamId: string }) => call(() => api.tournaments.removeTeam(id, teamId)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }, 'Tournaments', { type: 'Standings', id }],
    }),
    addTournamentScorer: b.mutation({
      queryFn: ({ id, email }: { id: string; email: string }) => call(() => api.tournaments.addScorer(id, email)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }],
    }),
    getTournamentNotices: b.query({
      queryFn: (id: string) => call(() => api.tournaments.notices(id)),
      providesTags: (_r, _e, id) => [{ type: 'Notices', id }],
    }),
    updateTournament: b.mutation({
      queryFn: ({ id, input }: { id: string; input: UpdateTournamentInput }) => call(() => api.tournaments.update(id, input)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }, 'Tournaments', { type: 'Fixtures', id }, { type: 'Standings', id }],
    }),
    pauseTournament: b.mutation({
      queryFn: ({ id, input }: { id: string; input: PauseTournamentInput }) => call(() => api.tournaments.pause(id, input)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }, { type: 'Notices', id }, 'Tournaments'],
    }),
    resumeTournament: b.mutation({
      queryFn: ({ id, input }: { id: string; input: ResumeTournamentInput }) => call(() => api.tournaments.resume(id, input)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tournament', id }, { type: 'Notices', id }, { type: 'Fixtures', id }, { type: 'Standings', id }, 'Tournaments'],
    }),
    addTournamentNotice: b.mutation({
      queryFn: ({ id, input }: { id: string; input: CreateNoticeInput }) => call(() => api.tournaments.addNotice(id, input)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Notices', id }],
    }),
    resolveTournamentNotice: b.mutation({
      queryFn: ({ id, noticeId }: { id: string; noticeId: string }) => call(() => api.tournaments.resolveNotice(id, noticeId)),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Notices', id }],
    }),
    generateFixtures: b.mutation({
      queryFn: (id: string) => call(() => api.tournaments.generateFixtures(id)),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Tournament', id },
        { type: 'Fixtures', id },
        { type: 'Standings', id },
        'Tournaments',
      ],
    }),
  }),
});

export const {
  useGetTournamentsQuery,
  useGetTournamentQuery,
  useGetFixturesQuery,
  useGetStandingsQuery,
  useGetTournamentAwardsQuery,
  useCreateTournamentMutation,
  useAddTournamentTeamMutation,
  useRemoveTournamentTeamMutation,
  useAddTournamentScorerMutation,
  useGenerateFixturesMutation,
  useSetGroupsMutation,
  useGetTournamentNoticesQuery,
  useUpdateTournamentMutation,
  usePauseTournamentMutation,
  useResumeTournamentMutation,
  useAddTournamentNoticeMutation,
  useResolveTournamentNoticeMutation,
} = tournamentsApi;
