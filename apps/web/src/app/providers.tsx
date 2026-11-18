import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from '@/components/ui/sonner';
import { hydrateSession } from '@/features/auth/authSlice';
import { store } from './store';

/** Redux store, saved-session restore, and the toast outlet. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void store.dispatch(hydrateSession());
  }, []);
  return (
    <Provider store={store}>
      {children}
      <Toaster />
    </Provider>
  );
}
