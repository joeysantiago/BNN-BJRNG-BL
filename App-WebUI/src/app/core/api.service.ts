import { Injectable } from '@angular/core';
import { ApiResponse } from './models/api.model';
import { environment } from '../../environments/environment';

/** Talks to our own API. JSON endpoints answer { success, message, data }; this unwraps `data` and throws the server's message on failure. */
@Injectable({ providedIn: 'root' })
export class ApiService {

  readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  // #region Public Methods

  url(path: string): string {
    return this.base + path;
  }

  async get<T>(path: string, ms = 15000): Promise<T> {
    return this.unwrap<T>(await this.request(path, {}, ms));
  }

  /** Request options for a JSON body, plus extra headers such as X-Master-Key. Pass the result to `send`, `sendFull` or `message`. */
  json(body: unknown, headers: Record<string, string> = {}): RequestInit {
    return { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
  }

  /** Same as `get` but for any method and body, with extra headers such as X-Edit-Password. */
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

  private async request(path: string, init: RequestInit, ms: number): Promise<Response> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      return await fetch(this.url(path), { cache: 'no-store', ...init, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // #endregion
}
