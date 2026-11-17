import type { CreateTournamentInput } from '@cricket/shared';
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
  useCreateTournamentMutation,
  useAddTournamentTeamMutation,
  useRemoveTournamentTeamMutation,
  useAddTournamentScorerMutation,
  useGenerateFixturesMutation,
} = tournamentsApi;
