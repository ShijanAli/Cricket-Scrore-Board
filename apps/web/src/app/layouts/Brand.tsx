import { Link } from 'react-router-dom';
import { paths } from '@/lib/paths';

export function Brand({ to = paths.home }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold tracking-tight">
      <img src="/favicon.png" alt="" className="size-7 rounded-md" />
      <span>Cricket Score</span>
    </Link>
  );
}
