import { ApiClient } from '@/api/client';
import { createApi } from '@/api/endpoints';
import { resolveApiUrl } from './config';
import { secureTokenStore } from './secure-session';

/** Break the api <-> auth-store import cycle: the store registers itself here. */
let expiredHandler: (() => void) | null = null;
export const onSessionExpired = (fn: () => void): void => {
  expiredHandler = fn;
};

export const API_URL = resolveApiUrl();

export const client = new ApiClient({
  baseUrl: API_URL,
  tokens: secureTokenStore,
  onSessionExpired: () => expiredHandler?.(),
});

export const api = createApi(client);
