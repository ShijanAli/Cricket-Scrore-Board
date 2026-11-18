import { EngineError, activeEvents, canUndo, replayInnings } from '@cricket/engine';
import {
  ballEventSchema,
  type BallEvent,
  type InningsSetup,
  type InningsState,
  type MatchRules,
} from '@cricket/shared';
import { ApiError } from '../api/client';
import type { EventsResult, IngestResult } from '../api/types';
import { uuid } from '../lib/uuid';
import { deliveryFromIntent, type Intent, type NewEvent } from './intents';
import { mergeLogs, stripSeq } from './merge';
import type { LocalEventStore, StoredEvent } from './store';

/** The two API calls scoring needs. The real `api.matches` satisfies this. */
export interface ScoringApi {
  ingestEvents(matchId: string, input: { inningsNo: number; events: BallEvent[] }): Promise<IngestResult>;
  listEvents(matchId: string, inningsNo: number, afterSeq?: number): Promise<EventsResult>;
}

export interface ScoringConfig {
  matchId: string;
  inningsNo: number;
  setup: InningsSetup;
  rules: MatchRules;
  target: number | null;
  store: LocalEventStore;
  api: ScoringApi;
  newId?: () => string;
}

export interface RejectedInfo {
  message: string;
  code: string;
  eventId?: string;
}

export interface ScoringSnapshot {
  ready: boolean;
  state: InningsState;
  /** Balls saved on the phone but not yet confirmed by the server. */
  pending: number;
  syncing: boolean;
  offline: boolean;
  /** Server refused a batch. Scoring on this phone is paused until the scorer decides. */
  rejected: RejectedInfo | null;
  /** Another scorer holds the match. */
  locked: boolean;
  canUndo: boolean;
}

/** Thrown when scoring is paused because the server refused an earlier batch. */
export class SyncBlockedError extends Error {
  constructor(message = 'Resolve the sync problem before scoring more') {
    super(message);
    this.name = 'SyncBlockedError';
  }
}

const BATCH = 200;
type Listener = () => void;

/**
 * Offline-first scoring. Every tap is checked by the engine, saved on the phone, then sent in
 * the background. The screen always shows the engine's replay of the local log, so it is
 * instant and never waits for the network.
 */
export class ScoringController {
  private events: StoredEvent[] = [];
  private listeners = new Set<Listener>();
  private flushing: Promise<void> | null = null;
  private snap: ScoringSnapshot;
  private readonly newId: () => string;
  private offline = false;
  private rejected: RejectedInfo | null = null;
  private locked = false;

  constructor(private readonly cfg: ScoringConfig) {
    this.newId = cfg.newId ?? uuid;
    this.snap = this.build(false);
  }

  // ---- subscription (works with useSyncExternalStore) ----
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): ScoringSnapshot => this.snap;

  private emit(ready = true, syncing = !!this.flushing): void {
    this.snap = this.build(ready, syncing);
    this.listeners.forEach((l) => l());
  }

  private replay(items: readonly StoredEvent[]): InningsState {
    return replayInnings(this.cfg.setup, this.cfg.rules, items.map((i) => i.event), this.cfg.target);
  }

  private build(ready: boolean, syncing = false): ScoringSnapshot {
    const log = this.events.map((e) => e.event);
    const active = activeEvents(log);
    const last = active[active.length - 1];
    return {
      ready,
      state: this.replay(this.events),
      pending: this.events.filter((e) => !e.synced).length,
      syncing,
      offline: this.offline,
      rejected: this.rejected,
      locked: this.locked,
      canUndo: !!last && canUndo(log, last.id),
    };
  }

  // ---- loading ----
  /** Load the phone's log, then merge with the server's if reachable. Never throws on network errors. */
  async init(): Promise<void> {
    const { store, matchId, inningsNo } = this.cfg;
    this.events = await store.load(matchId, inningsNo);
    this.emit(true);
    await this.pullServer(false);
    void this.flush();
  }

  private async pullServer(replace: boolean): Promise<boolean> {
    try {
      const res = await this.cfg.api.listEvents(this.cfg.matchId, this.cfg.inningsNo, 0);
      const server = res.events.map(stripSeq);
      const merged = replace ? server.map((event) => ({ event, synced: true })) : mergeLogs(server, this.events);
      // Never adopt a log the engine cannot replay.
      this.replay(merged);
      this.events = merged;
      await this.cfg.store.replaceAll(this.cfg.matchId, this.cfg.inningsNo, merged);
      this.offline = false;
      this.emit();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) this.offline = true;
      this.emit();
      return false;
    }
  }

  // ---- scoring ----
  /** Score a delivery. Throws EngineError (nothing saved) if the engine says it is illegal. */
  async dispatchIntent(intent: Intent): Promise<void> {
    await this.add(deliveryFromIntent(this.snap.state, intent));
  }

  /** Add any event (delivery, batterIn, bowlerSelected, strikeSwap, retire). */
  async add(input: NewEvent): Promise<void> {
    this.assertOpen();
    const event = ballEventSchema.parse({ ...input, id: this.newId() });
    await this.commit(event);
  }

  async undo(): Promise<void> {
    this.assertOpen();
    const log = this.events.map((e) => e.event);
    const active = activeEvents(log);
    const last = active[active.length - 1];
    if (!last || !canUndo(log, last.id)) throw new EngineError('UNDO_INVALID', 'Nothing to undo');
    await this.commit(ballEventSchema.parse({ id: this.newId(), type: 'undo', targetEventId: last.id }));
  }

  private assertOpen(): void {
    if (this.rejected) throw new SyncBlockedError();
  }

  private async commit(event: BallEvent): Promise<void> {
    const next: StoredEvent[] = [...this.events, { event, synced: false }];
    this.replay(next); // throws EngineError if illegal: nothing is saved
    await this.cfg.store.append(this.cfg.matchId, this.cfg.inningsNo, event);
    this.events = next;
    this.emit();
    void this.flush();
  }

  // ---- syncing ----
  /** Send unsynced balls. One flush at a time; safe to call as often as you like. */
  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    if (this.rejected || this.locked) return Promise.resolve();
    this.flushing = this.runFlush().finally(() => {
      this.flushing = null;
      this.emit();
    });
    this.emit(true, true);
    return this.flushing;
  }

  private async runFlush(): Promise<void> {
    const { api, store, matchId, inningsNo } = this.cfg;
    for (;;) {
      const batch = this.events.filter((e) => !e.synced).slice(0, BATCH);
      if (batch.length === 0) return;
      try {
        const ids = batch.map((b) => b.event.id);
        // accepted or duplicate both mean the server has it
        await api.ingestEvents(matchId, { inningsNo, events: batch.map((b) => b.event) });
        await store.markSynced(ids);
        const done = new Set(ids);
        this.events = this.events.map((e) => (done.has(e.event.id) ? { ...e, synced: true } : e));
        this.offline = false;
        this.emit(true, true);
      } catch (e) {
        this.handleSyncError(e);
        return;
      }
    }
  }

  private handleSyncError(e: unknown): void {
    if (!(e instanceof ApiError)) {
      this.offline = true; // unknown failure: keep the balls, retry later
      return;
    }
    if (e.isNetwork || e.status >= 500) {
      this.offline = true;
      return;
    }
    if (e.status === 409 || e.status === 403) {
      this.locked = true;
      return;
    }
    if (e.status === 401) {
      this.offline = true; // client already tried a refresh; keep local data
      return;
    }
    const eventId =
      e.details && typeof e.details === 'object' && 'eventId' in e.details
        ? String((e.details as { eventId: unknown }).eventId)
        : undefined;
    this.rejected = { message: e.message, code: e.code, eventId };
  }

  /** The scorer lock was regained (or the user wants to retry). */
  clearLocked(): void {
    this.locked = false;
    this.emit();
    void this.flush();
  }

  /** After a rejection: throw away everything unsynced and adopt the server's log. */
  async resetToServer(): Promise<boolean> {
    const ok = await this.pullServer(true);
    if (ok) {
      this.rejected = null;
      this.emit();
    }
    return ok;
  }

  /** Keep the unsynced balls and try again (e.g. after the scorer fixed the XI). */
  retryRejected(): void {
    this.rejected = null;
    this.emit();
    void this.flush();
  }
}
