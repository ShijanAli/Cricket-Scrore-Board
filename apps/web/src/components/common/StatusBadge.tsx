import { statusLabel, statusTone } from '@cricket/client-core';
import type { MatchStatus } from '@cricket/shared';
import { Badge } from '@/components/ui/badge';

const VARIANT = { neutral: 'secondary', success: 'success', live: 'live', warning: 'warning' } as const;

/** Match status as a coloured badge. Label and tone come from client-core, same as mobile. */
export function StatusBadge({ status }: { status: MatchStatus }) {
  return <Badge variant={VARIANT[statusTone(status)]}>{statusLabel(status)}</Badge>;
}
