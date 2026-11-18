import type { SQLiteDatabase } from 'expo-sqlite';
import { ballEventSchema, type BallEvent } from '@cricket/shared';
import type { LocalEventStore, StoredEvent } from '@cricket/client-core';

const SCHEMA_VERSION = 1;

/** Run from <SQLiteProvider onInit>. */
export async function migrateLocalDb(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= SCHEMA_VERSION) return;
  await db.execAsync(`
    PRAGMA journal_mode = 'wal';
    CREATE TABLE IF NOT EXISTS local_events (
      ord        INTEGER PRIMARY KEY AUTOINCREMENT,
      id         TEXT NOT NULL UNIQUE,
      match_id   TEXT NOT NULL,
      innings_no INTEGER NOT NULL,
      payload    TEXT NOT NULL,
      synced     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_local_events_innings ON local_events (match_id, innings_no, ord);
  `);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

interface Row {
  payload: string;
  synced: number;
}

export class SqliteEventStore implements LocalEventStore {
  constructor(private readonly db: SQLiteDatabase) {}

  async load(matchId: string, inningsNo: number): Promise<StoredEvent[]> {
    const rows = await this.db.getAllAsync<Row>(
      'SELECT payload, synced FROM local_events WHERE match_id = ? AND innings_no = ? ORDER BY ord',
      matchId,
      inningsNo,
    );
    // Parse again with the shared schema: defends against a half-written or old-format row.
    return rows.map((r) => ({ event: ballEventSchema.parse(JSON.parse(r.payload)), synced: r.synced === 1 }));
  }

  async append(matchId: string, inningsNo: number, event: BallEvent): Promise<void> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO local_events (id, match_id, innings_no, payload, synced) VALUES (?, ?, ?, ?, 0)',
      event.id,
      matchId,
      inningsNo,
      JSON.stringify(event),
    );
  }

  async markSynced(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    const marks = eventIds.map(() => '?').join(',');
    await this.db.runAsync(`UPDATE local_events SET synced = 1 WHERE id IN (${marks})`, ...eventIds);
  }

  async replaceAll(matchId: string, inningsNo: number, items: StoredEvent[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM local_events WHERE match_id = ? AND innings_no = ?', matchId, inningsNo);
      for (const item of items) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO local_events (id, match_id, innings_no, payload, synced) VALUES (?, ?, ?, ?, ?)',
          item.event.id,
          matchId,
          inningsNo,
          JSON.stringify(item.event),
          item.synced ? 1 : 0,
        );
      }
    });
  }
}
