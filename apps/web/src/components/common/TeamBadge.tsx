import { cn } from '@/lib/utils';

export interface TeamBadgeProps {
  shortName: string;
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'size-8 text-[10px]', md: 'size-11 text-xs', lg: 'size-16 text-base' } as const;

export function TeamBadge({ shortName, color, size = 'md', className }: TeamBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', SIZES[size], className)}
      style={{ backgroundColor: color || '#0E7C4A' }}
    >
      {shortName.slice(0, 4)}
    </span>
  );
}
