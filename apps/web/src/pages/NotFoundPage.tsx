import { CricketBall, Stumps } from '@/components/art/CricketArt';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/paths';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="relative">
        <Stumps bailsOff className="h-36 w-28 drop-shadow-xl" />
        <CricketBall className="animate-float-slow absolute -top-2 -right-6 size-10" />
      </div>
      <p className="text-gradient text-7xl font-extrabold">404</p>
      <p className="text-lg font-semibold">This page is out for a duck</p>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild>
        <Link to={paths.home}>Back to home</Link>
      </Button>
    </div>
  );
}
