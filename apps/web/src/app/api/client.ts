import { ApiClient, createApi } from '@cricket/client-core';
import { tokenStore } from '@/features/auth/tokenStorage';
import { env } from '@/lib/env';

/** Breaks the store <-> client import cycle: the store registers its handler here. */
let expiredHandler: (() => void) | null = null;
export const onSessionExpired = (fn: () => void): void => {
  expiredHandler = fn;
};

/** The one HTTP client. Same class the mobile app uses: bearer token, single-flight refresh, ApiError. */
export const client = new ApiClient({
  baseUrl: env.apiUrl,
  tokens: tokenStore,
  onSessionExpired: () => expiredHandler?.(),
});

export const api = createApi(client);
