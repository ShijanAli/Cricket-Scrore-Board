import type { BallEvent } from '@cricket/shared';
import type { StoredServerEvent } from '@/api/types';
import type { StoredEvent } from './store';

/** The server sends `seq` with every event. The engine and the outbox do not need it. */
export const stripSeq = ({ seq: _seq, ...event }: StoredServerEvent): BallEvent => event as BallEvent;

/**
 * Combine what the server has with what is on the phone.
 * The server's log comes first and is trusted. Anything only the phone has stays in the outbox
 * (in the order it was scored) and will be sent. A phone event the server does not have is
 * never marked synced, even if the phone thought it was, so it gets re-sent and re-checked.
 */
export function mergeLogs(server: readonly BallEvent[], local: readonly StoredEvent[]): StoredEvent[] {
  const known = new Set(server.map((e) => e.id));
  const merged: StoredEvent[] = server.map((event) => ({ event, synced: true }));
  for (const item of local) {
    if (!known.has(item.event.id)) merged.push({ event: item.event, synced: false });
  }
  return merged;
}
