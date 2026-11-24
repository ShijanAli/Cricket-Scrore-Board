import { CricketBall } from '@/components/art/CricketArt';
import { Link } from 'react-router-dom';
import { paths } from '@/lib/paths';
import { cn } from '@/lib/utils';

export function Brand({ to = paths.home, light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-gradient')}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
        <CricketBall className="size-6" />
      </span>
      <span>Cricket Score</span>
    </Link>
  );
}
