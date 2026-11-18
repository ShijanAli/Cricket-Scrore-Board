import type { BallEvent } from '@cricket/shared';
import type { LocalEventStore, StoredEvent } from './store';

/** In-memory store for tests. */
export class MemoryEventStore implements LocalEventStore {
  private rows: { matchId: string; inningsNo: number; event: BallEvent; synced: boolean }[] = [];

  async load(matchId: string, inningsNo: number): Promise<StoredEvent[]> {
    return this.rows
      .filter((r) => r.matchId === matchId && r.inningsNo === inningsNo)
      .map((r) => ({ event: r.event, synced: r.synced }));
  }

  async append(matchId: string, inningsNo: number, event: BallEvent): Promise<void> {
    if (this.rows.some((r) => r.event.id === event.id)) return; // like INSERT OR IGNORE
    this.rows.push({ matchId, inningsNo, event, synced: false });
  }

  async markSynced(eventIds: string[]): Promise<void> {
    const ids = new Set(eventIds);
    this.rows.forEach((r) => {
      if (ids.has(r.event.id)) r.synced = true;
    });
  }

  async replaceAll(matchId: string, inningsNo: number, items: StoredEvent[]): Promise<void> {
    this.rows = this.rows.filter((r) => !(r.matchId === matchId && r.inningsNo === inningsNo));
    items.forEach((i) => this.rows.push({ matchId, inningsNo, event: i.event, synced: i.synced }));
  }
}
