import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, type TokenPair, type TokenStore } from '../client';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function setup(handler: (url: string, init: RequestInit) => Response | Promise<Response>, start: TokenPair | null) {
  let tokens = start;
  const store: TokenStore = { get: async () => tokens, set: async (t) => void (tokens = t) };
  const calls: { url: string; auth?: string }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    calls.push({ url: String(url), auth: headers.get('authorization') ?? undefined });
    return handler(String(url), init);
  }) as unknown as typeof fetch;
  const onSessionExpired = vi.fn();
  const client = new ApiClient({ baseUrl: 'http://x/api', tokens: store, fetchImpl, onSessionExpired });
  return { client, calls, onSessionExpired, getTokens: () => tokens };
}

describe('ApiClient', () => {
  it('sends the bearer token and parses json', async () => {
    const t = setup(() => json(200, { ok: 1 }), { accessToken: 'a1', refreshToken: 'r1' });
    expect(await t.client.get('/ping')).toEqual({ ok: 1 });
    expect(t.calls[0]!.auth).toBe('Bearer a1');
  });

  it('maps API errors to ApiError with code and details', async () => {
    const t = setup(() => json(422, { error: { code: 'ENGINE', message: 'bad', details: { eventId: 'e1' } } }), null);
    const err = await t.client.get('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'ENGINE', details: { eventId: 'e1' } });
  });

  it('turns a fetch failure into a network ApiError', async () => {
    const t = setup(() => {
      throw new TypeError('Network request failed');
    }, null);
    const err = (await t.client.get('/x').catch((e) => e)) as ApiError;
    expect(err.isNetwork).toBe(true);
    expect(err.status).toBe(0);
  });

  it('refreshes once on 401 and retries; parallel 401s share ONE refresh', async () => {
    let refreshes = 0;
    const t = setup((url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++;
        return json(200, { accessToken: 'a2', refreshToken: 'r2' });
      }
      const auth = new Headers(init.headers).get('authorization');
      return auth === 'Bearer a2' ? json(200, { ok: true }) : json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } });
    }, { accessToken: 'a1', refreshToken: 'r1' });
    const results = await Promise.all([t.client.get('/a'), t.client.get('/b'), t.client.get('/c')]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(t.getTokens()).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('ends the session when the refresh token is rejected', async () => {
    const t = setup((url) =>
      url.endsWith('/auth/refresh')
        ? json(401, { error: { code: 'INVALID_REFRESH', message: 'no' } })
        : json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }),
    { accessToken: 'a1', refreshToken: 'r1' });
    await expect(t.client.get('/a')).rejects.toBeInstanceOf(ApiError);
    expect(t.getTokens()).toBeNull();
    expect(t.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails because we are offline', async () => {
    const t = setup((url) => {
      if (url.endsWith('/auth/refresh')) throw new TypeError('Network request failed');
      return json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } });
    }, { accessToken: 'a1', refreshToken: 'r1' });
    await expect(t.client.get('/a')).rejects.toBeInstanceOf(ApiError);
    expect(t.getTokens()).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
    expect(t.onSessionExpired).not.toHaveBeenCalled();
  });

  it('returns undefined for 204', async () => {
    const t = setup(() => new Response(null, { status: 204 }), null);
    expect(await t.client.delete('/x')).toBeUndefined();
  });
});
