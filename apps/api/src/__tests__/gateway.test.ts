import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_EVENTS, LIVE_NAMESPACE, type ScoreUpdatedPayload } from '@cricket/shared';
import { createFakePrisma, type FakePrisma } from './fake-prisma';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../db/prisma', () => ({
  get prisma() {
    return h.db;
  },
}));

const { LiveGateway } = await import('../modules/live/live.gateway');
const { liveBus } = await import('../modules/live/live-bus');
const { signAccessToken } = await import('../lib/tokens');

const matchA = randomUUID();
const matchB = randomUUID();
const owner = randomUUID();

let db: FakePrisma;
let server: Server;
let gateway: InstanceType<typeof LiveGateway>;
let url: string;
const sockets: Socket[] = [];

const client = (token?: string) => {
  const s = connect(url, { transports: ['websocket'], auth: token ? { token } : {}, forceNew: true });
  sockets.push(s);
  return s;
};
const once = <T>(s: Socket, event: string) => new Promise<T>((resolve) => s.once(event, resolve));
const join = (s: Socket, matchId: string) =>
  new Promise<boolean>((resolve) => s.emit(LIVE_EVENTS.client.joinMatch, { matchId }, resolve));
const settle = () => new Promise((r) => setTimeout(r, 50));

beforeEach(async () => {
  db = createFakePrisma();
  h.db = db;
  for (const id of [matchA, matchB]) {
    db.table('match').rows.push({
      id, ownerId: owner, status: 'live', rules: {}, currentInningsNo: 1, activeScorerId: null, scorerLockedAt: null, tournamentId: null,
    });
  }
  db.table('innings').rows.push({ id: randomUUID(), matchId: matchA, inningsNo: 1, lastSeq: 4, snapshot: { runs: 17, wickets: 1 } });

  server = createServer();
  gateway = new LiveGateway(server);
  gateway.attach();
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as AddressInfo).port}${LIVE_NAMESPACE}`;
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect());
  await gateway.close();
  server.close();
});

describe('LiveGateway', () => {
  it('a viewer needs no login, joins a match and gets the current score at once', async () => {
    const viewer = client();
    const score = once<ScoreUpdatedPayload>(viewer, LIVE_EVENTS.server.scoreUpdated);
    expect(await join(viewer, matchA)).toBe(true);
    const first = await score;
    expect(first).toMatchObject({ matchId: matchA, inningsNo: 1, lastSeq: 4, innings: { runs: 17 } });
  });

  it('broadcasts only to viewers of that match', async () => {
    const a = client();
    const b = client();
    await join(a, matchA);
    await join(b, matchB);
    await settle();

    const gotA: ScoreUpdatedPayload[] = [];
    const gotB: ScoreUpdatedPayload[] = [];
    a.on(LIVE_EVENTS.server.scoreUpdated, (p) => gotA.push(p));
    b.on(LIVE_EVENTS.server.scoreUpdated, (p) => gotB.push(p));

    const payload = { matchId: matchA, inningsNo: 1, lastSeq: 5, innings: { runs: 21 } as never };
    liveBus.scoreUpdated(payload);
    await settle();
    expect(gotA).toEqual([payload]);
    expect(gotB).toEqual([]);
  });

  it('stops delivering after leaving the match', async () => {
    const v = client();
    await join(v, matchA);
    await settle();
    v.emit(LIVE_EVENTS.client.leaveMatch, { matchId: matchA });
    await settle();
    const got: unknown[] = [];
    v.on(LIVE_EVENTS.server.matchStatus, (p) => got.push(p));
    liveBus.matchStatus({ matchId: matchA, status: 'completed' });
    await settle();
    expect(got).toEqual([]);
  });

  it('rejects a connection with an invalid token', async () => {
    const bad = client('garbage');
    const err = await new Promise<Error>((resolve) => bad.once('connect_error', resolve));
    expect(err.message).toBe('INVALID_TOKEN');
  });

  it('refuses a malformed match id', async () => {
    expect(await join(client(), 'not-a-uuid')).toBe(false);
  });

  it('a logged-in scorer can lock the match and viewers are told', async () => {
    const viewer = client();
    await join(viewer, matchA);
    await settle();
    const changed = new Promise<{ scorerUserId: string | null }>((resolve) =>
      viewer.on(LIVE_EVENTS.server.scorerChanged, (p) => p.scorerUserId && resolve(p)),
    );

    const scorer = client(signAccessToken(owner));
    const ok = await new Promise<boolean>((resolve) => scorer.emit(LIVE_EVENTS.client.scorerLock, { matchId: matchA }, resolve));
    expect(ok).toBe(true);
    expect((await changed).scorerUserId).toBe(owner);
    expect(db.table('match').rows[0]!.activeScorerId).toBe(owner);

    scorer.emit(LIVE_EVENTS.client.scorerRelease, { matchId: matchA });
    await settle();
    expect(db.table('match').rows[0]!.activeScorerId).toBeNull();
  });

  it('anonymous or unauthorised users cannot lock', async () => {
    const anon = client();
    expect(await new Promise<boolean>((r) => anon.emit(LIVE_EVENTS.client.scorerLock, { matchId: matchA }, r))).toBe(false);

    const stranger = client(signAccessToken(randomUUID()));
    const errored = once<{ code: string }>(stranger, LIVE_EVENTS.server.error);
    expect(await new Promise<boolean>((r) => stranger.emit(LIVE_EVENTS.client.scorerLock, { matchId: matchA }, r))).toBe(false);
    expect((await errored).code).toBe('FORBIDDEN');
    expect(db.table('match').rows[0]!.activeScorerId).toBeNull();
  });
});
