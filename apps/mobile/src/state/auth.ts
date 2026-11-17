import { create } from 'zustand';
import type { AuthResult, User } from '@cricket/client-core';
import { api, onSessionExpired } from '@/lib/api';
import { secureTokenStore, userStore } from '@/lib/secure-session';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: User | null;
  /** Read the saved session. Signed-in users see the app at once, even offline. */
  hydrate: () => Promise<void>;
  signIn: (result: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  async hydrate() {
    const [tokens, user] = await Promise.all([secureTokenStore.get(), userStore.get()]);
    if (!tokens || !user) {
      set({ status: 'signedOut', user: null });
      return;
    }
    set({ status: 'signedIn', user });
    // Refresh the profile in the background. A rejected session is handled by onSessionExpired.
    api.auth
      .me()
      .then(async (fresh) => {
        if (get().status !== 'signedIn') return;
        await userStore.set(fresh);
        set({ user: fresh });
      })
      .catch(() => undefined);
  },

  async signIn(result) {
    await secureTokenStore.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    await userStore.set(result.user);
    set({ status: 'signedIn', user: result.user });
  },

  async signOut() {
    const tokens = await secureTokenStore.get();
    set({ status: 'signedOut', user: null }); // leave the UI first, never wait for the network
    await secureTokenStore.set(null);
    await userStore.set(null);
    if (tokens) await api.auth.logout(tokens.refreshToken).catch(() => undefined);
  },
}));

onSessionExpired(() => {
  void userStore.set(null);
  useAuth.setState({ status: 'signedOut', user: null });
});
