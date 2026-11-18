import type { LoginInput, RegisterInput } from '@cricket/shared';
import { api } from '@/app/api/client';
import { baseApi, call } from '@/app/api/baseApi';
import { startSession } from './authSlice';

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation({
      queryFn: (input: LoginInput) => call(() => api.auth.login(input)),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(startSession(data));
        } catch {
          // the form shows the error from the mutation result
        }
      },
    }),
    register: b.mutation({
      queryFn: (input: RegisterInput) => call(() => api.auth.register(input)),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(startSession(data));
        } catch {
          // the form shows the error from the mutation result
        }
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
