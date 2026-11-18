import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authReducer, sessionExpired } from '@/features/auth/authSlice';
import { baseApi } from './api/baseApi';
import { onSessionExpired } from './api/client';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

// refetchOnFocus / refetchOnReconnect
setupListeners(store.dispatch);

onSessionExpired(() => void store.dispatch(sessionExpired()));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
