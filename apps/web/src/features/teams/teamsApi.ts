import type { AddSquadPlayerInput, CreateTeamInput } from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';

export const teamsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getTeams: b.query({
      queryFn: (_: void) => call(() => api.teams.list()),
      providesTags: ['Teams'],
    }),
    getTeam: b.query({
      queryFn: (id: string) => call(() => api.teams.get(id)),
      providesTags: (_r, _e, id) => [{ type: 'Team', id }],
    }),
    createTeam: b.mutation({
      queryFn: (input: CreateTeamInput) => call(() => api.teams.create(input)),
      invalidatesTags: ['Teams'],
    }),
    deleteTeam: b.mutation({
      queryFn: (id: string) => call(() => api.teams.remove(id)),
      invalidatesTags: ['Teams'],
    }),
    addSquadPlayer: b.mutation({
      queryFn: ({ teamId, input }: { teamId: string; input: AddSquadPlayerInput }) =>
        call(() => api.teams.addPlayer(teamId, input)),
      invalidatesTags: (_r, _e, { teamId }) => [{ type: 'Team', id: teamId }, 'Teams'],
    }),
    removeSquadPlayer: b.mutation({
      queryFn: ({ teamId, playerId }: { teamId: string; playerId: string }) =>
        call(() => api.teams.removePlayer(teamId, playerId)),
      invalidatesTags: (_r, _e, { teamId }) => [{ type: 'Team', id: teamId }, 'Teams'],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useAddSquadPlayerMutation,
  useRemoveSquadPlayerMutation,
} = teamsApi;
