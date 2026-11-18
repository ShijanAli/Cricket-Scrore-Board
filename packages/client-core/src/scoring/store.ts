import type { BallEvent } from '@cricket/shared';

export interface StoredEvent {
  event: BallEvent;
  /** true once the server has confirmed it. false = still in the outbox. */
  synced: boolean;
}

/**
 * Where scored balls live on the phone. The real implementation is SQLite (sqlite-store.ts);
 * tests use memory-store.ts. A ball is saved here BEFORE it is sent, so a crash or a dead
 * network never loses a delivery.
 */
export interface LocalEventStore {
  /** Events of one innings in the order they were scored. */
  load(matchId: string, inningsNo: number): Promise<StoredEvent[]>;
  append(matchId: string, inningsNo: number, event: BallEvent): Promise<void>;
  markSynced(eventIds: string[]): Promise<void>;
  /** Replace the whole log (used after syncing with the server). */
  replaceAll(matchId: string, inningsNo: number, items: StoredEvent[]): Promise<void>;
}
