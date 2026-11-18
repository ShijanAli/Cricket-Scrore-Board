import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BallEvent } from '@cricket/shared';
import { IdbEventStore } from '../idb-store';

const ball = (id: string, runs = 1): BallEvent =>
  ({ id, type: 'delivery', strikerId: 'p1', bowlerId: 'b1', runs, extra: 'none', boundary: false }) as BallEvent;

let store: IdbEventStore;
beforeEach(() => {
  // a fresh database for every test
  store = new IdbEventStore(new IDBFactory());
});

describe('IdbEventStore', () => {
  it('returns balls in the order they were scored', async () => {
    await store.append('m1', 1, ball('a'));
    await store.append('m1', 1, ball('b'));
    await store.append('m1', 1, ball('c'));
    const rows = await store.load('m1', 1);
    expect(rows.map((r) => r.event.id)).toEqual(['a', 'b', 'c']);
    expect(rows.every((r) => !r.synced)).toBe(true);
  });

  it('keeps innings and matches apart', async () => {
    await store.append('m1', 1, ball('a'));
    await store.append('m1', 2, ball('b'));
    await store.append('m2', 1, ball('c'));
    expect((await store.load('m1', 1)).map((r) => r.event.id)).toEqual(['a']);
    expect((await store.load('m1', 2)).map((r) => r.event.id)).toEqual(['b']);
    expect((await store.load('m2', 1)).map((r) => r.event.id)).toEqual(['c']);
  });

  it('ignores a ball id it already has', async () => {
    await store.append('m1', 1, ball('a', 1));
    await store.append('m1', 1, ball('a', 6));
    const rows = await store.load('m1', 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.event).toMatchObject({ runs: 1 });
  });

  it('marks balls as synced and keeps the rest pending', async () => {
    await store.append('m1', 1, ball('a'));
    await store.append('m1', 1, ball('b'));
    await store.markSynced(['a']);
    const rows = await store.load('m1', 1);
    expect(rows.map((r) => [r.event.id, r.synced])).toEqual([['a', true], ['b', false]]);
    await store.markSynced([]); // no-op
    await store.markSynced(['missing']); // unknown ids are ignored
  });

  it('replaces one innings without touching another', async () => {
    await store.append('m1', 1, ball('a'));
    await store.append('m1', 1, ball('b'));
    await store.append('m1', 2, ball('x'));
    await store.replaceAll('m1', 1, [
      { event: ball('s1'), synced: true },
      { event: ball('s2'), synced: true },
      { event: ball('b'), synced: false },
      { event: ball('s1'), synced: true }, // duplicate in the input is dropped
    ]);
    const rows = await store.load('m1', 1);
    expect(rows.map((r) => [r.event.id, r.synced])).toEqual([['s1', true], ['s2', true], ['b', false]]);
    expect((await store.load('m1', 2)).map((r) => r.event.id)).toEqual(['x']);
  });

  it('survives reopening the database', async () => {
    const factory = new IDBFactory();
    await new IdbEventStore(factory).append('m1', 1, ball('a'));
    const reopened = new IdbEventStore(factory);
    expect((await reopened.load('m1', 1)).map((r) => r.event.id)).toEqual(['a']);
  });
});
