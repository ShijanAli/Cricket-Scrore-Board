import { Redirect } from 'expo-router';
import { useAuth } from '@/state/auth';

/**
 * The app opens at "/", which lives in the signed-in group. While signed out that group is
 * guarded, so "/" matches nothing. Send the user to where they can actually go instead of
 * showing "Unmatched Route".
 */
export default function NotFound() {
  const status = useAuth((s) => s.status);
  return <Redirect href={status === 'signedIn' ? '/' : '/login'} />;
}
