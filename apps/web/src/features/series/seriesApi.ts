import type { CreateSeriesInput } from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';

export const seriesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getSeriesList: b.query({
      queryFn: (_: void) => call(() => api.series.list()),
      providesTags: ['SeriesList'],
    }),
    getSeries: b.query({
      queryFn: (id: string) => call(() => api.series.get(id)),
      providesTags: (_r, _e, id) => [{ type: 'Series', id }],
    }),
    getSeriesAwards: b.query({
      queryFn: (id: string) => call(() => api.series.awards(id)),
      providesTags: (_r, _e, id) => [{ type: 'Series', id }],
    }),
    createSeries: b.mutation({
      queryFn: (input: CreateSeriesInput) => call(() => api.series.create(input)),
      invalidatesTags: ['SeriesList'],
    }),
  }),
});

export const { useGetSeriesListQuery, useGetSeriesQuery, useGetSeriesAwardsQuery, useCreateSeriesMutation } = seriesApi;
