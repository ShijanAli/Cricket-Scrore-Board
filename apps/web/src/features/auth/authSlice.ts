import type { AuthResult, User } from '@cricket/client-core';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/app/api/client';
import { baseApi } from '@/app/api/baseApi';
import { tokenStore, userStore } from './tokenStorage';

type Status = 'loading' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: Status;
  user: User | null;
}

const initialState: AuthState = { status: 'loading', user: null };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<User>) {
      state.status = 'signedIn';
      state.user = action.payload;
    },
    signedOut(state) {
      state.status = 'signedOut';
      state.user = null;
    },
  },
});

export const { signedIn, signedOut } = slice.actions;
export const authReducer = slice.reducer;

/** Read the saved session. A signed-in user sees the app at once, even offline. */
export const hydrateSession = createAsyncThunk('auth/hydrate', async (_: void, { dispatch, getState }) => {
  const [tokens, user] = [await tokenStore.get(), userStore.get()];
  if (!tokens || !user) {
    dispatch(signedOut());
    return;
  }
  dispatch(signedIn(user));
  // Refresh the profile in the background. A rejected session is handled by onSessionExpired.
  try {
    const fresh = await api.auth.me();
    if ((getState() as { auth: AuthState }).auth.status === 'signedIn') {
      userStore.set(fresh);
      dispatch(signedIn(fresh));
    }
  } catch {
    // offline or expired: nothing to do here
  }
});

/** Save the tokens and user a login/register call returned, then open the app. */
export const startSession = createAsyncThunk('auth/start', async (result: AuthResult, { dispatch }) => {
  await tokenStore.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  userStore.set(result.user);
  dispatch(signedIn(result.user));
});

/** Leave the screen first, never wait for the network. */
export const signOut = createAsyncThunk('auth/signOut', async (_: void, { dispatch }) => {
  const tokens = await tokenStore.get();
  dispatch(signedOut());
  await tokenStore.set(null);
  userStore.set(null);
  dispatch(baseApi.util.resetApiState());
  if (tokens) await api.auth.logout(tokens.refreshToken).catch(() => undefined);
});

/** The refresh token was rejected: the user must log in again. */
export const sessionExpired = createAsyncThunk('auth/expired', async (_: void, { dispatch }) => {
  userStore.set(null);
  dispatch(signedOut());
  dispatch(baseApi.util.resetApiState());
});
