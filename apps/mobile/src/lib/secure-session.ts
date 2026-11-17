import * as SecureStore from 'expo-secure-store';
import { type TokenPair, type TokenStore, type User } from '@cricket/client-core';

const TOKENS = 'cricket.tokens';
const USER = 'cricket.user';

const read = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // a corrupt value must never lock the user out of the app
  }
};

/** Tokens live in the OS keychain/keystore, never in plain AsyncStorage. */
export const secureTokenStore: TokenStore = {
  get: () => read<TokenPair>(TOKENS),
  async set(tokens) {
    if (tokens) await SecureStore.setItemAsync(TOKENS, JSON.stringify(tokens));
    else await SecureStore.deleteItemAsync(TOKENS);
  },
};

export const userStore = {
  get: () => read<User>(USER),
  async set(user: User | null) {
    if (user) await SecureStore.setItemAsync(USER, JSON.stringify(user));
    else await SecureStore.deleteItemAsync(USER);
  },
};
