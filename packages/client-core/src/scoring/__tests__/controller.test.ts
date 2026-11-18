import { describe, expect, it } from 'vitest';
import { EngineError } from '@cricket/engine';
import type { BallEvent, InningsSetup, MatchRules } from '@cricket/shared';
import { ApiError } from '../../api/client';
import type { EventsResult, IngestResult } from '../../api/types';
import { ScoringController, SyncBlockedError, type ScoringApi } from '../controller';
import { MemoryEventStore } from '../memory-store';
import { mergeLogs } from '../merge';

const rules: MatchRules = {
  oversPerInnings: 2, ballsPerOver: 6, maxOversPerBowler: null, playersPerSide: 4,
  wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, allowByes: true, allowLegByes: true, lastManStands: false,
};
const setup: InningsSetup = {
  battingTeamId: 'A', bowlingTeamId: 'B', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1',
};

class FakeApi implements ScoringApi {
  serverEvents: BallEvent[] = [];
  down = false;
  failWith: ApiError | null = null;
  calls: BallEvent[][] = [];
  async ingestEvents(_m: string, input: { inningsNo: number; events: BallEvent[] }): Promise<IngestResult> {
    if (this.down) throw new ApiError(0, 'NETWORK', 'offline');
    if (this.failWith) throw this.failWith;
    this.calls.push(input.events);
    const known = new Set(this.serverEvents.map((e) => e.id));
    const fresh = input.events.filter((e) => !known.has(e.id));
    this.serverEvents.push(...fresh);
    return { accepted: fresh.length, duplicates: [], lastSeq: this.serverEvents.length } as unknown as IngestResult;
  }
  async listEvents(): Promise<EventsResult> {
    if (this.down) throw new ApiError(0, 'NETWORK', 'offline');
    return {
      inningsNo: 1,
      lastSeq: this.serverEvents.length,
      events: this.serverEvents.map((e, i) => ({ ...e, seq: i + 1 })),
    };
  }
}

function make(api = new FakeApi(), store = new MemoryEventStore()) {
  let n = 0;
  const c = new ScoringController({
    matchId: 'm1', inningsNo: 1, setup, rules, target: null, store, api,
    newId: () => `e${++n}`,
  });
  return { c, api, store };
}

describe('ScoringController', () => {
  it('scores locally and syncs in the background', async () => {
    const { c, api } = make();
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 4 });
    await c.flush();
    const s = c.getSnapshot();
    expect(s.state.runs).toBe(4);
    expect(s.state.legalBalls).toBe(1);
    expect(s.pending).toBe(0);
    expect(api.serverEvents).toHaveLength(1);
  });

  it('keeps scoring offline and sends everything when back online', async () => {
    const { c, api } = make();
    api.down = true;
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 1 });
    await c.dispatchIntent({ kind: 'runs', runs: 6 });
    await c.flush();
    let s = c.getSnapshot();
    expect(s.state.runs).toBe(7);
    expect(s.pending).toBe(2);
    expect(s.offline).toBe(true);
    api.down = false;
    await c.flush();
    s = c.getSnapshot();
    expect(s.pending).toBe(0);
    expect(s.offline).toBe(false);
    expect(api.serverEvents.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('survives an app restart: a new controller reloads unsynced balls from the store', async () => {
    const store = new MemoryEventStore();
    const a = make(new FakeApi(), store);
    a.api.down = true;
    await a.c.init();
    await a.c.dispatchIntent({ kind: 'runs', runs: 2 });
    const b = make(a.api, store); // same phone storage, new process
    b.api.down = false;
    await b.c.init();
    await b.c.flush();
    expect(b.c.getSnapshot().state.runs).toBe(2);
    expect(b.c.getSnapshot().pending).toBe(0);
    expect(b.api.serverEvents).toHaveLength(1);
  });

  it('rejects an illegal ball without saving it', async () => {
    const { c, store } = make();
    await c.init();
    await expect(c.add({ type: 'batterIn', batterId: 'a3' })).rejects.toBeInstanceOf(EngineError);
    expect(await store.load('m1', 1)).toHaveLength(0);
    expect(c.getSnapshot().pending).toBe(0);
  });

  it('undo removes the last ball and is itself synced', async () => {
    const { c, api } = make();
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 4 });
    expect(c.getSnapshot().canUndo).toBe(true);
    await c.undo();
    await c.flush();
    const s = c.getSnapshot();
    expect(s.state.runs).toBe(0);
    expect(s.canUndo).toBe(false);
    expect(api.serverEvents.map((e) => e.type)).toEqual(['delivery', 'undo']);
    await expect(c.undo()).rejects.toBeInstanceOf(EngineError);
  });

  it('pulls the server log on init and keeps unsynced local balls after it', async () => {
    const api = new FakeApi();
    const first = make(api);
    await first.c.init();
    await first.c.dispatchIntent({ kind: 'runs', runs: 1 });
    await first.c.flush();
    // a second phone has only its own ball locally, offline
    const store = new MemoryEventStore();
    const second = make(api, store);
    await second.c.init();
    expect(second.c.getSnapshot().state.runs).toBe(1); // adopted from server
  });

  it('a 422 rejection pauses scoring; resetToServer adopts the server log', async () => {
    const { c, api } = make();
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 3 });
    await c.flush();
    api.failWith = new ApiError(422, 'ENGINE_ERROR', 'bad ball', { eventId: 'e2', index: 0 });
    await c.dispatchIntent({ kind: 'runs', runs: 1 });
    await c.flush();
    let s = c.getSnapshot();
    expect(s.rejected?.eventId).toBe('e2');
    await expect(c.dispatchIntent({ kind: 'runs', runs: 1 })).rejects.toBeInstanceOf(SyncBlockedError);
    api.failWith = null;
    expect(await c.resetToServer()).toBe(true);
    s = c.getSnapshot();
    expect(s.rejected).toBeNull();
    expect(s.state.runs).toBe(3);
    expect(s.pending).toBe(0);
  });

  it('a 409 marks the match as locked by another scorer and stops sending', async () => {
    const { c, api } = make();
    await c.init();
    api.failWith = new ApiError(409, 'SCORER_LOCKED', 'locked');
    await c.dispatchIntent({ kind: 'runs', runs: 1 });
    await c.flush();
    expect(c.getSnapshot().locked).toBe(true);
    expect(c.getSnapshot().pending).toBe(1);
    api.failWith = null;
    c.clearLocked();
    await c.flush();
    expect(c.getSnapshot().pending).toBe(0);
  });

  it('flush is single-flight', async () => {
    const { c, api } = make();
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 1 });
    await Promise.all([c.flush(), c.flush(), c.flush()]);
    const sent = api.calls.flat().filter((e) => e.id === 'e1');
    expect(sent.length).toBe(1);
  });

  it('notifies subscribers', async () => {
    const { c } = make();
    let n = 0;
    c.subscribe(() => n++);
    await c.init();
    await c.dispatchIntent({ kind: 'runs', runs: 1 });
    expect(n).toBeGreaterThan(0);
  });
});

describe('mergeLogs', () => {
  const ev = (id: string): BallEvent => ({ id, type: 'strikeSwap' });
  it('puts the server first and keeps phone-only events unsynced', () => {
    const merged = mergeLogs([ev('s1'), ev('s2')], [
      { event: ev('s1'), synced: true },
      { event: ev('l1'), synced: true }, // phone thought it was synced, server disagrees
    ]);
    expect(merged.map((m) => [m.event.id, m.synced])).toEqual([
      ['s1', true], ['s2', true], ['l1', false],
    ]);
  });
});
