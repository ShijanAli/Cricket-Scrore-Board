import { ballEventSchema, type BallEvent } from '@cricket/shared';
import type { LocalEventStore, StoredEvent } from '@cricket/client-core';

/**
 * The web version of the phone's SQLite outbox: scored balls live in IndexedDB, so a closed tab,
 * a crash or a dead network never loses a delivery. Same LocalEventStore contract as mobile.
 */
const DB_NAME = 'cricket-scoring';
const STORE = 'events';
const VERSION = 1;

interface Row {
  /** Auto-increment key: the order in which balls were scored. */
  ord?: number;
  id: string;
  matchId: string;
  inningsNo: number;
  payload: BallEvent;
  synced: 0 | 1;
}

const request = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const finished = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (db.objectStoreNames.contains(STORE)) return;
      const store = db.createObjectStore(STORE, { keyPath: 'ord', autoIncrement: true });
      store.createIndex('byId', 'id', { unique: true });
      store.createIndex('byInnings', ['matchId', 'inningsNo']);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'));
  });
}

export class IdbEventStore implements LocalEventStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= openDb(this.factory).catch((e) => {
      this.dbPromise = null; // allow a retry on the next call
      throw e;
    });
    return this.dbPromise;
  }

  async load(matchId: string, inningsNo: number): Promise<StoredEvent[]> {
    const db = await this.db();
    const rows = await request(
      db.transaction(STORE, 'readonly').objectStore(STORE).index('byInnings').getAll(IDBKeyRange.only([matchId, inningsNo])),
    );
    // Equal index keys come back in primary-key order, which is the order balls were scored.
    // Parse again with the shared schema: defends against a half-written or old-format row.
    return (rows as Row[]).map((r) => ({ event: ballEventSchema.parse(r.payload), synced: r.synced === 1 }));
  }

  async append(matchId: string, inningsNo: number, event: BallEvent): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const exists = await request(store.index('byId').getKey(event.id));
    // INSERT OR IGNORE: the same ball id is never stored twice.
    if (exists === undefined) store.add({ id: event.id, matchId, inningsNo, payload: event, synced: 0 } satisfies Row);
    await finished(tx);
  }

  async markSynced(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    const db = await this.db();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const byId = store.index('byId');
    await Promise.all(
      eventIds.map(async (id) => {
        const row = (await request(byId.get(id))) as Row | undefined;
        if (row && row.synced !== 1) store.put({ ...row, synced: 1 });
      }),
    );
    await finished(tx);
  }

  async replaceAll(matchId: string, inningsNo: number, items: StoredEvent[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    // one transaction: a crash half way leaves the old log, never a half-written one
    const keys = await request(store.index('byInnings').getAllKeys(IDBKeyRange.only([matchId, inningsNo])));
    for (const key of keys) store.delete(key);
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.event.id)) continue;
      seen.add(item.event.id);
      store.add({ id: item.event.id, matchId, inningsNo, payload: item.event, synced: item.synced ? 1 : 0 } satisfies Row);
    }
    await finished(tx);
  }
}

let shared: IdbEventStore | null = null;
/** One store per tab. */
export const getEventStore = (): IdbEventStore => (shared ??= new IdbEventStore());
