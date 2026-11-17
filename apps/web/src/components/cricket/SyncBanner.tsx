import type { ScoringSnapshot } from '@cricket/client-core';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type LockState = 'pending' | 'held' | 'denied';

export interface SyncBannerProps {
  snapshot: ScoringSnapshot;
  lock: LockState;
  onRetry: () => void;
  onDiscard: () => void;
  onUnlock: () => void;
}

/** Tells the scorer whether their balls are safe: synced, waiting for the network, or refused by the server. */
export function SyncBanner({ snapshot, lock, onRetry, onDiscard, onUnlock }: SyncBannerProps) {
  if (snapshot.rejected) {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-semibold text-destructive">Server refused a ball</p>
        <p className="text-sm text-muted-foreground">{snapshot.rejected.message}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" variant="destructive" onClick={onDiscard}>
            Discard &amp; reload
          </Button>
        </div>
      </div>
    );
  }
  if (lock === 'denied' || snapshot.locked) {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
        <p className="font-semibold text-warning">Another scorer is scoring this match</p>
        <p className="text-sm text-muted-foreground">Your balls stay saved in this browser.</p>
        {snapshot.locked ? (
          <Button size="sm" variant="outline" onClick={onUnlock}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }
  if (snapshot.pending > 0) {
    return (
      <Badge variant="warning" className="gap-1.5 py-1">
        {snapshot.offline ? <CloudOff /> : <Loader2 className="animate-spin" />}
        {snapshot.offline ? `Offline · ${snapshot.pending} to sync` : `Syncing ${snapshot.pending}…`}
      </Badge>
    );
  }
  return (
    <Badge variant={snapshot.offline ? 'warning' : 'success'} className="gap-1.5 py-1">
      {snapshot.offline ? <CloudOff /> : <Cloud />}
      {snapshot.offline ? 'Offline' : 'All synced'}
    </Badge>
  );
}
