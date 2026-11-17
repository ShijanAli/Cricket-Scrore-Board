import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Spinner } from '@/components/common/QueryBoundary';
import { paths } from '@/lib/paths';

/** Only signed-in users pass. Others go to the login page and come back here afterwards. */
export function ProtectedRoute() {
  const status = useAppSelector((s) => s.auth.status);
  const location = useLocation();
  if (status === 'loading') return <Spinner className="py-32" />;
  if (status === 'signedOut') return <Navigate to={paths.login} replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** The login and register pages: signed-in users skip them. */
export function GuestRoute() {
  const status = useAppSelector((s) => s.auth.status);
  const location = useLocation();
  if (status === 'loading') return <Spinner className="py-32" />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? paths.app.matches} replace />;
  }
  return <Outlet />;
}
