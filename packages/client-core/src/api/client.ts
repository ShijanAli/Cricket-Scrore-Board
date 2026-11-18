/**
 * HTTP client. No React Native imports on purpose: it is unit tested in Node.
 * - Adds the bearer token.
 * - On 401 it refreshes the token once (shared by all requests that fail at the same time) and retries.
 * - Turns every failure into an ApiError with the server's code, so screens can branch on `code`.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The phone could not reach the server (offline, wrong URL, timeout). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  get(): Promise<TokenPair | null>;
  set(tokens: TokenPair | null): Promise<void>;
}

export interface ClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Called when the refresh token is rejected: the user must log in again. */
  onSessionExpired?: () => void;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** false for public endpoints and for login/register. Default true. */
  auth?: boolean;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;
  private readonly doFetch: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly opts: ClientOptions) {
    // Arrow wrapper, not a bare `fetch` reference: calling window.fetch as a method of another object throws "Illegal invocation" in browsers.
    this.doFetch = opts.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  get<T>(path: string, o?: RequestOptions) {
    return this.request<T>('GET', path, o);
  }
  post<T>(path: string, body?: unknown, o?: RequestOptions) {
    return this.request<T>('POST', path, { ...o, body });
  }
  put<T>(path: string, body?: unknown, o?: RequestOptions) {
    return this.request<T>('PUT', path, { ...o, body });
  }
  patch<T>(path: string, body?: unknown, o?: RequestOptions) {
    return this.request<T>('PATCH', path, { ...o, body });
  }
  delete<T = void>(path: string, o?: RequestOptions) {
    return this.request<T>('DELETE', path, o);
  }

  async request<T>(method: Method, path: string, o: RequestOptions = {}): Promise<T> {
    const useAuth = o.auth !== false;
    try {
      return await this.send<T>(method, path, o, useAuth);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401 || !useAuth) throw e;
      // Access token expired. Refresh once, then retry once.
      const refreshed = await this.refreshTokens();
      if (!refreshed) throw e;
      return this.send<T>(method, path, o, useAuth);
    }
  }

  private async send<T>(method: Method, path: string, o: RequestOptions, useAuth: boolean): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (o.body !== undefined) headers['Content-Type'] = 'application/json';
    if (useAuth) {
      const tokens = await this.opts.tokens.get();
      if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.doFetch(this.url(path, o.query), {
        method,
        headers,
        body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection.');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 204) return undefined as T;

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // empty or non-JSON body
    }
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? `Request failed (${res.status})`, err?.details);
    }
    return data as T;
  }

  private url(path: string, query?: RequestOptions['query']): string {
    const base = this.opts.baseUrl.replace(/\/+$/, '');
    const qs = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }

  /** One refresh at a time: ten parallel 401s must not burn ten refresh tokens (they rotate). */
  private refreshTokens(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const current = await this.opts.tokens.get();
    if (!current) return false;
    try {
      const next = await this.send<TokenPair>('POST', '/auth/refresh', { body: { refreshToken: current.refreshToken } }, false);
      await this.opts.tokens.set({ accessToken: next.accessToken, refreshToken: next.refreshToken });
      return true;
    } catch (e) {
      // Offline: keep the session, the request just fails. Rejected: the session is over.
      if (e instanceof ApiError && !e.isNetwork && e.status < 500) {
        await this.opts.tokens.set(null);
        this.opts.onSessionExpired?.();
      }
      return false;
    }
  }
}
