import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Shows a back arrow that links here. */
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-l-4 border-emerald-500 pl-4">
      <div className="flex min-w-0 items-start gap-2">
        {backTo ? (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
            <Link to={backTo} aria-label="Back">
              <ArrowLeft />
            </Link>
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-gradient truncate text-3xl font-extrabold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
