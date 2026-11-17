import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { EngineError } from '@cricket/engine';
import { createFakePrisma } from './fake-prisma';

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../db/prisma', () => ({
  get prisma() {
    return h.db;
  },
}));

const { createApp } = await import('../app');
const { signAccessToken } = await import('../lib/tokens');

let db: ReturnType<typeof createFakePrisma>;
const app = createApp();

beforeEach(() => {
  db = createFakePrisma();
  h.db = db;
});

const creds = { name: 'Rahim Uddin', email: 'Rahim@Example.com', password: 'secret-pass-1' };

describe('auth', () => {
  it('register -> login -> me', async () => {
    const reg = await request(app).post('/auth/register').send(creds);
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ name: 'Rahim Uddin', email: 'rahim@example.com' }); // email lower-cased
    expect(reg.body.user.passwordHash).toBeUndefined();
    expect(db.table('user').rows[0]!.passwordHash).not.toBe(creds.password); // hashed

    const login = await request(app).post('/auth/login').send({ email: 'RAHIM@example.com', password: creds.password });
    expect(login.status).toBe(200);

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('rahim@example.com');
  });

  it('duplicate email is a 409', async () => {
    await request(app).post('/auth/register').send(creds);
    const again = await request(app).post('/auth/register').send(creds);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('wrong password and unknown email give the same 401', async () => {
    await request(app).post('/auth/register').send(creds);
    const wrong = await request(app).post('/auth/login').send({ email: creds.email, password: 'nope-nope-1' });
    const unknown = await request(app).post('/auth/login').send({ email: 'x@y.com', password: 'nope-nope-1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('refresh rotates the token; replaying the old one revokes every session', async () => {
    const reg = await request(app).post('/auth/register').send(creds);
    const t1: string = reg.body.refreshToken;

    const r1 = await request(app).post('/auth/refresh').send({ refreshToken: t1 });
    expect(r1.status).toBe(200);
    const t2: string = r1.body.refreshToken;
    expect(t2).not.toBe(t1);

    const replay = await request(app).post('/auth/refresh').send({ refreshToken: t1 });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('TOKEN_REUSED');

    // The thief's replay also killed the legitimate new token.
    const afterTheft = await request(app).post('/auth/refresh').send({ refreshToken: t2 });
    expect(afterTheft.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const reg = await request(app).post('/auth/register').send(creds);
    const out = await request(app).post('/auth/logout').send({ refreshToken: reg.body.refreshToken });
    expect(out.status).toBe(204);
    const again = await request(app).post('/auth/refresh').send({ refreshToken: reg.body.refreshToken });
    expect(again.status).toBe(401);
  });

  it('an expired refresh token is refused', async () => {
    const reg = await request(app).post('/auth/register').send(creds);
    db.table('refreshToken').rows[0]!.expiresAt = new Date(Date.now() - 1000);
    const res = await request(app).post('/auth/refresh').send({ refreshToken: reg.body.refreshToken });
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('request validation and errors', () => {
  it('rejects an invalid body with field details (zod schemas from @cricket/shared)', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'R', email: 'bad', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('protected routes need a valid bearer token', async () => {
    expect((await request(app).get('/teams')).status).toBe(401);
    const bad = await request(app).get('/teams').set('Authorization', 'Bearer garbage');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_TOKEN');
    const ok = await request(app).get('/teams').set('Authorization', `Bearer ${signAccessToken('u1')}`);
    expect(ok.status).toBe(200);
  });

  it('ids in the URL must be UUIDs (no 500 from Postgres)', async () => {
    const res = await request(app).get('/matches/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('unknown routes are a JSON 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('malformed JSON is a 400, not a crash', async () => {
    const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('health check', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  });

  it('engine rule violations become 422, unexpected errors a generic 500', async () => {
    // Drive the real error handler through a throwing route.
    const { errorHandler } = await import('../middleware/error-handler');
    const express = (await import('express')).default;
    const probe = express();
    probe.get('/rule', () => {
      throw new EngineError('BOWLER_QUOTA_EXCEEDED', 'Bowler has bowled their maximum overs');
    });
    probe.get('/boom', () => {
      throw new Error('secret internal detail');
    });
    probe.get('/uuid', () => {
      throw Object.assign(new Error('Inconsistent column data'), { code: 'P2023' });
    });
    probe.use(errorHandler);

    const rule = await request(probe).get('/rule');
    expect(rule.status).toBe(422);
    expect(rule.body.error).toEqual({ code: 'BOWLER_QUOTA_EXCEEDED', message: 'Bowler has bowled their maximum overs' });

    const boom = await request(probe).get('/boom');
    expect(boom.status).toBe(500);
    expect(JSON.stringify(boom.body)).not.toContain('secret'); // internals are never leaked

    expect((await request(probe).get('/uuid')).status).toBe(400);
  });
});

describe('GET /matches/:id', () => {
  it('is public and tells the caller whether they can score', async () => {
    const owner = '11111111-1111-4111-8111-111111111111';
    const id = '22222222-2222-4222-8222-222222222222';
    db.table('match').rows.push({
      id, ownerId: owner, type: 'single', status: 'scheduled', rules: {}, tournamentId: null, scheduledDate: null,
    });

    const anon = await request(app).get(`/matches/${id}`);
    expect(anon.status).toBe(200);
    expect(anon.body.match.canScore).toBe(false);

    const mine = await request(app).get(`/matches/${id}`).set('Authorization', `Bearer ${signAccessToken(owner)}`);
    expect(mine.body.match.canScore).toBe(true);

    const other = await request(app).get(`/matches/${id}`).set('Authorization', `Bearer ${signAccessToken('33333333-3333-4333-8333-333333333333')}`);
    expect(other.body.match.canScore).toBe(false);
  });
});
