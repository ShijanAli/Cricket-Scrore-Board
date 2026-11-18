import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Brand />
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
