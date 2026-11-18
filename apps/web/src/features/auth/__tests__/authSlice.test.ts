import { beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny in-memory localStorage, because these tests run in Node.
const data = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  },
});

const { authReducer, signedIn, signedOut } = await import('../authSlice');
const { tokenStore, userStore } = await import('../tokenStorage');

const user = { id: 'u1', name: 'Shijan', email: 's@example.com' };

describe('authSlice', () => {
  it('starts loading, then signs in and out', () => {
    const s0 = authReducer(undefined, { type: 'init' });
    expect(s0).toEqual({ status: 'loading', user: null });
    const s1 = authReducer(s0, signedIn(user));
    expect(s1).toEqual({ status: 'signedIn', user });
    expect(authReducer(s1, signedOut())).toEqual({ status: 'signedOut', user: null });
  });
});

describe('token storage', () => {
  beforeEach(() => data.clear());

  it('round-trips tokens and the user', async () => {
    expect(await tokenStore.get()).toBeNull();
    await tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    userStore.set(user);
    expect(await tokenStore.get()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(userStore.get()).toEqual(user);
  });

  it('clears on null', async () => {
    await tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    await tokenStore.set(null);
    userStore.set(null);
    expect(await tokenStore.get()).toBeNull();
    expect(userStore.get()).toBeNull();
  });

  it('ignores corrupt stored data', async () => {
    data.set('cricket.tokens', '{not json');
    data.set('cricket.user', 'nope');
    expect(await tokenStore.get()).toBeNull();
    expect(userStore.get()).toBeNull();
  });
});
