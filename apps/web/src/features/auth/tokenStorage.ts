import type { TokenPair, TokenStore, User } from '@cricket/client-core';

const TOKENS_KEY = 'cricket.tokens';
const USER_KEY = 'cricket.user';

/** localStorage can throw (private mode, quota). Fall back to memory so the app still works for the tab. */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
  }
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Tokens, in the shape the shared ApiClient expects. */
export const tokenStore: TokenStore = {
  async get() {
    const t = parse<TokenPair>(read(TOKENS_KEY));
    return t?.accessToken && t.refreshToken ? t : null;
  },
  async set(tokens) {
    write(TOKENS_KEY, tokens ? JSON.stringify(tokens) : null);
  },
};

/** The signed-in user, kept so a reload (even offline) shows the app straight away. */
export const userStore = {
  get: (): User | null => parse<User>(read(USER_KEY)),
  set: (user: User | null): void => write(USER_KEY, user ? JSON.stringify(user) : null),
};
