import type {
  CreateSingleMatchInput,
  InningsSetup,
  PlayingXIInput,
  ScheduleMatchInput,
  TossInput,
} from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';

export const matchesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getMatches: b.query({
      queryFn: (page: number = 1) => call(() => api.matches.list(page)),
      providesTags: ['Matches'],
    }),
    getLiveMatches: b.query({
      queryFn: (_: void) => call(() => api.matches.live()),
      providesTags: ['Live'],
    }),
    getMatch: b.query({
      queryFn: (id: string) => call(() => api.matches.get(id)),
      providesTags: (_r, _e, id) => [{ type: 'Match', id }],
    }),
    createMatch: b.mutation({
      queryFn: (input: CreateSingleMatchInput) => call(() => api.matches.createSingle(input)),
      invalidatesTags: ['Matches'],
    }),
    setPlayingXI: b.mutation({
      queryFn: ({ matchId, input }: { matchId: string; input: PlayingXIInput }) =>
        call(() => api.matches.setPlayingXI(matchId, input)),
      invalidatesTags: (_r, _e, { matchId }) => [{ type: 'Match', id: matchId }],
    }),
    recordToss: b.mutation({
      queryFn: ({ matchId, input }: { matchId: string; input: TossInput }) =>
        call(() => api.matches.toss(matchId, input)),
      invalidatesTags: (_r, _e, { matchId }) => [{ type: 'Match', id: matchId }, 'Matches'],
    }),
    startInnings: b.mutation({
      queryFn: ({ matchId, input }: { matchId: string; input: InningsSetup }) =>
        call(() => api.matches.startInnings(matchId, input)),
      invalidatesTags: (_r, _e, { matchId }) => [{ type: 'Match', id: matchId }, 'Matches', 'Live'],
    }),
    scheduleMatch: b.mutation({
      queryFn: ({ matchId, input }: { matchId: string; input: ScheduleMatchInput }) =>
        call(() => api.matches.schedule(matchId, input)),
      invalidatesTags: (_r, _e, { matchId }) => [{ type: 'Match', id: matchId }, 'Matches', 'Fixtures'],
    }),
  }),
});

export const {
  useGetMatchesQuery,
  useGetLiveMatchesQuery,
  useGetMatchQuery,
  useCreateMatchMutation,
  useSetPlayingXIMutation,
  useRecordTossMutation,
  useStartInningsMutation,
  useScheduleMatchMutation,
} = matchesApi;
