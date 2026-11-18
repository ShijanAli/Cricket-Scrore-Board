import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/paths';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-lg font-semibold">This page is out for a duck</p>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild>
        <Link to={paths.home}>Back to home</Link>
      </Button>
    </div>
  );
}
