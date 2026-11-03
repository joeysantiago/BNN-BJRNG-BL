import { Injectable } from '@angular/core';
import { AuthHooks } from './models/auth.model';
import { ApiResponse } from './models/api.model';
import { environment } from '../../environments/environment';

/** Calls that must never trigger a refresh after a 401: the login itself and the refresh (a failed refresh would otherwise wait on itself). */
const NO_RETRY = /^\/auth\/(login|register|refresh|logout)$/;

/**
 * Talks to our own API. JSON endpoints answer { success, message, data }; this unwraps `data` and throws the server's message on failure.
 * When someone is logged in every call carries `Authorization: Bearer` and the cookies (`credentials: 'include'`), and a 401 is retried once after a refresh.
 */
@Injectable({ providedIn: 'root' })

export class ApiService {
  private auth: AuthHooks | null = null;
  readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  // #region Public Methods

  url(path: string): string {
    return this.base + path;
  }

  /** Called once by AuthService, so every request can use the login without ApiService depending on it. */
  useAuth(hooks: AuthHooks): void {
    this.auth = hooks;
  }

  async get<T>(path: string, ms = 15000): Promise<T> {
    return this.unwrap<T>(await this.request(path, {}, ms));
  }

  /** Request options for a JSON body, plus extra headers such as X-Idempotency-Key. Pass the result to `send`, `sendFull` or `message`. */
  json(body: unknown, headers: Record<string, string> = {}): RequestInit {
    return { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
  }

  /** A file from the API (for example a bill photo), sent with the login token like every other call. An error response throws its message. */
  async blob(path: string, init: RequestInit = {}, ms = 30000): Promise<Blob> {
    const res = await this.request(path, init, ms);
    if (!res.ok)
      await this.parse(res);
    return res.blob();
  }

  /** Same as `get` but for any method and body, with extra headers. */
  async send<T>(method: string, path: string, init: RequestInit = {}, ms = 120000): Promise<T> {
    return this.unwrap<T>(await this.request(path, { ...init, method }, ms));
  }

  /** Same as `send` for calls that return no data, only the server's message in the visitor's language. */
  async message(method: string, path: string, init: RequestInit = {}, ms = 15000): Promise<string> {
    return (await this.parse<null>(await this.request(path, { ...init, method }, ms))).message ?? '';
  }

  /** Same as `send` but keeps the whole answer, so the caller gets the data and the server's message together. */
  async sendFull<T>(method: string, path: string, init: RequestInit = {}, ms = 120000): Promise<ApiResponse<T>> {
    return this.parse<T>(await this.request(path, { ...init, method }, ms));
  }

  // #endregion

  // #region Private Methods

  private async unwrap<T>(res: Response): Promise<T> {
    return (await this.parse<T>(res)).data;
  }

  private async parse<T>(res: Response): Promise<ApiResponse<T>> {
    const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!res.ok || !body?.success)
      throw Object.assign(new Error(body?.message ?? String(res.status)), { status: res.status });
    return body;
  }

  /** One call. A 401 with a token means it ran out or the session ended: one refresh is tried, then the call is sent once more with the new token. */
  private async request(path: string, init: RequestInit, ms: number): Promise<Response> {
    const token = this.auth?.token() ?? null;
    const res = await this.fetchOnce(path, init, ms, token);
    if (res.status !== 401 || !token || NO_RETRY.test(path) || !(await this.auth?.refresh()))
      return res;
    return this.fetchOnce(path, init, ms, this.auth?.token() ?? null);
  }

  private async fetchOnce(path: string, init: RequestInit, ms: number, token: string | null): Promise<Response> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    const headers = new Headers(init.headers);
    if (token && !headers.has('Authorization'))
      headers.set('Authorization', 'Bearer ' + token);
    const credentials: RequestCredentials | undefined = token || path.startsWith('/auth/') ? 'include' : init.credentials;
    try {
      return await fetch(this.url(path), { cache: 'no-store', ...init, headers, credentials, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // #endregion
}
