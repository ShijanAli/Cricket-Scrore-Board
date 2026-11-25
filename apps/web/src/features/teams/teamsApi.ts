import type { AddSquadPlayerInput, AddSquadPlayersBulkInput, CreateTeamInput } from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';

/**
 * Mutations here update the cached data directly instead of invalidating it. Invalidating makes the app
 * fetch the whole team again after every click, which on a slow connection is a visible pause; patching
 * is instant and needs no second request.
 */
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
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        try {
          const { data: team } = await queryFulfilled;
          dispatch(teamsApi.util.updateQueryData('getTeams', undefined, (list) => void list.unshift({ ...team, _count: { roster: 0 } })));
        } catch {
          // the form shows the error
        }
      },
    }),
    deleteTeam: b.mutation({
      queryFn: (id: string) => call(() => api.teams.remove(id)),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          teamsApi.util.updateQueryData('getTeams', undefined, (list) => {
            const i = list.findIndex((t) => t.id === id);
            if (i >= 0) list.splice(i, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
    }),
    addSquadPlayer: b.mutation({
      queryFn: ({ teamId, input }: { teamId: string; input: AddSquadPlayerInput }) =>
        call(() => api.teams.addPlayer(teamId, input)),
      async onQueryStarted({ teamId }, { dispatch, queryFulfilled }) {
        try {
          const { data: member } = await queryFulfilled;
          dispatch(
            teamsApi.util.updateQueryData('getTeam', teamId, (t) => {
              if (!t.roster.some((m) => m.playerId === member.playerId)) t.roster.push(member);
            }),
          );
          dispatch(
            teamsApi.util.updateQueryData('getTeams', undefined, (list) => {
              const t = list.find((x) => x.id === teamId);
              if (t) t._count.roster += 1;
            }),
          );
        } catch {
          // the form shows the error
        }
      },
    }),
    addSquadPlayersBulk: b.mutation({
      queryFn: ({ teamId, input }: { teamId: string; input: AddSquadPlayersBulkInput }) =>
        call(() => api.teams.addPlayersBulk(teamId, input)),
      async onQueryStarted({ teamId }, { dispatch, queryFulfilled }) {
        try {
          const { data: members } = await queryFulfilled;
          dispatch(
            teamsApi.util.updateQueryData('getTeam', teamId, (t) => {
              t.roster.push(...members);
            }),
          );
          dispatch(
            teamsApi.util.updateQueryData('getTeams', undefined, (list) => {
              const t = list.find((x) => x.id === teamId);
              if (t) t._count.roster += members.length;
            }),
          );
        } catch {
          // the form shows the error
        }
      },
    }),
    removeSquadPlayer: b.mutation({
      queryFn: ({ teamId, playerId }: { teamId: string; playerId: string }) =>
        call(() => api.teams.removePlayer(teamId, playerId)),
      // optimistic: the player disappears at once; it comes back only if the server refuses
      async onQueryStarted({ teamId, playerId }, { dispatch, queryFulfilled }) {
        const undoTeam = dispatch(
          teamsApi.util.updateQueryData('getTeam', teamId, (t) => {
            t.roster = t.roster.filter((m) => m.playerId !== playerId);
          }),
        );
        const undoList = dispatch(
          teamsApi.util.updateQueryData('getTeams', undefined, (list) => {
            const t = list.find((x) => x.id === teamId);
            if (t) t._count.roster = Math.max(0, t._count.roster - 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undoTeam.undo();
          undoList.undo();
        }
      },
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useAddSquadPlayerMutation,
  useAddSquadPlayersBulkMutation,
  useRemoveSquadPlayerMutation,
} = teamsApi;
