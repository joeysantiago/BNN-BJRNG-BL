import { I18nService } from './i18n.service';
import { AuthHooks } from './models/auth.model';
import { ApiResponse } from './models/api.model';
import { DemoBackend } from './demo/demo-backend';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { SettingsOverrides } from './models/app-settings.model';

/** Calls that must never trigger a refresh after a 401: the login itself and the refresh (a failed refresh would otherwise wait on itself). */
const NO_RETRY = /^\/auth\/(login|register|refresh|logout)$/;

/**
 * Same calls as the ApiService of the API branches ({ success, message, data }, `data` unwrapped, the server's message thrown on failure, one refresh after a 401),
 * but Mojito has no API: every call is answered by the demo backend inside the browser (core/demo), so the pages built for the API work unchanged.
 */
@Injectable({ providedIn: 'root' })

export class ApiService {
  private auth: AuthHooks | null = null;
  private readonly i18n = inject(I18nService);
  private readonly backend = new DemoBackend();
  readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  // #region Public Methods

  url(path: string): string {
    return this.base + path;
  }

  /** The profile picture of a user (a data: URL kept by the demo backend), or null. */
  avatarUrl(userId: number): string | null {
    return this.backend.avatar(userId);
  }

  /** The saved site settings (what differs from appSettings.ts), read at once so pages can use them while they start. */
  savedSettings(): SettingsOverrides {
    return this.backend.settings();
  }

  /** Called once by AuthService, so every request can use the login without ApiService depending on it. */
  useAuth(hooks: AuthHooks): void {
    this.auth = hooks;
  }

  async get<T>(path: string, ms = 15000): Promise<T> {
    return this.unwrap<T>(await this.request(path, {}, ms));
  }

  /** Request options for a JSON body, plus extra headers such as Accept-Language. Pass the result to `send`, `sendFull` or `message`. */
  json(body: unknown, headers: Record<string, string> = {}): RequestInit {
    return { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
  }

  /** A file the backend answers with (SnapKhata's bill photos, party pictures and exports). A refusal is thrown with the backend's message, as `get` does. */
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

  /** Hands the call to the demo backend after a short pause (so busy states show) and wraps its answer in a Response, as fetch would. */
  private async fetchOnce(path: string, init: RequestInit, ms: number, token: string | null): Promise<Response> {
    const headers = new Headers(init.headers);
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    await new Promise((resolve) => setTimeout(resolve, Math.min(ms, environment.timings.demoDelayMs)));
    const reply = await this.backend.handle({ method: init.method ?? 'GET', path, body, token, lang: headers.get('Accept-Language') ?? this.i18n.lang() });
    if (reply.file)
      return new Response(reply.file, { status: reply.status, headers: { 'Content-Type': reply.file.type || 'application/octet-stream' } });
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
  }

  // #endregion
}
