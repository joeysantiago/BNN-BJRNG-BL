import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { KhataAuthResult, KhataOtpSendResult, KhataOtpSent, KhataPinProof, KhataPinPurpose, KhataTabMessage } from './models/khata.model';

const CHANNEL = 'snapkhata';
const HELLO_WAIT_MS = 300;
const RENEW_BEFORE_MS = 60_000;
const LOCK_AFTER_MS = 5 * 60_000;
const DEVICE_KEY = 'khata-device';
const REFRESH_LOCK = 'khata-refresh';

/**
 * SnapKhata login state. The access token lives in memory only, so every fresh start (new tab, reload, installed app opened) begins locked
 * and asks for the PIN. The refresh token is an HttpOnly cookie the browser sends to /khata/auth. Open tabs share unlock, lock and logout.
 */
@Injectable({ providedIn: 'root' })

export class KhataSessionService {
  private hiddenAt = 0;
  private expiresAt = 0;
  readonly hasPin = signal(false);
  readonly displayName = signal('');
  readonly loggedIn = signal(false);
  readonly unlocked = signal(false);
  private token: string | null = null;
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private channel: BroadcastChannel | null = null;
  private refreshing: Promise<boolean> | null = null;
  private renewTimer?: ReturnType<typeof setTimeout>;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.browser)
      return;
    this.listenToTabs();
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  // #region Public Methods

  /** Lock now: the PIN is needed again. Every open tab locks too. */
  lock(): void {
    this.lockLocally();
    this.post({ type: 'locked' });
  }

  async logout(): Promise<void> {
    await this.call('POST', '/khata/auth/logout').catch(() => null);
    this.clear();
    this.post({ type: 'logout' });
    void this.router.navigateByUrl('/khata/login');
  }

  /** True when there is a session: from memory, from another open tab (already unlocked), or from the refresh cookie (locked). */
  async ensureSession(): Promise<boolean> {
    if (this.token)
      return true;
    if (await this.askOtherTabs())
      return true;
    return this.refresh();
  }

  async unlock(pin: string): Promise<void> {
    this.apply(await this.auth('/khata/auth/pin/unlock', { pin }), true);
  }

  async setPin(pin: string): Promise<void> {
    this.apply(await this.auth('/khata/auth/pin', { pin }), true);
  }

  async sendOtp(identifier: string): Promise<KhataOtpSent> {
    const res = await this.api.sendFull<KhataOtpSendResult>('POST', '/khata/auth/otp/send', this.init({ identifier }), 30000);
    return { message: res.message ?? '', devCode: res.data?.devCode ?? null };
  }

  async changePin(newPin: string, proof: string): Promise<string> {
    return this.call<string>('PUT', '/khata/auth/pin', { pin: newPin }, { 'X-Khata-Pin-Proof': proof }, true);
  }

  async verifyOtp(identifier: string, code: string): Promise<void> {
    this.apply(await this.auth('/khata/auth/otp/verify', { identifier, code }), false);
  }

  async proof(purpose: KhataPinPurpose, pin: string, targetId?: number): Promise<string> {
    return (await this.call<KhataPinProof>('POST', '/khata/auth/pin/proof', { pin, purpose, targetId })).proof;
  }

  /**
   * Calls the SnapKhata API with the access token. A 401 means the token ran out or the session ended: one refresh is tried, then the
   * PIN screen (locked) or the login screen (session gone) is shown. `messageOnly` returns the server's message instead of the data.
   */
  async call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, messageOnly = false): Promise<T> {
    try {
      const init = this.init(body, { ...headers, ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) });
      const res = await this.api.sendFull<T>(method, path, init, 30000);
      return (messageOnly ? res.message ?? '' : res.data) as T;
    } catch (e) {
      // The login, refresh and logout calls themselves never trigger this (a failed refresh would otherwise wait on itself).
      if ((e as { status?: number }).status === 401 && this.loggedIn() && !path.startsWith('/khata/auth/refresh') && !path.startsWith('/khata/auth/otp') && path !== '/khata/auth/logout')
        await this.onSessionLost();
      throw e;
    }
  }

  // #endregion

  // #region Private Methods

  private clear(): void {
    this.token = null;
    this.expiresAt = 0;
    this.loggedIn.set(false);
    this.unlocked.set(false);
    clearTimeout(this.renewTimer);
  }

  private deviceId(): string {
    try {
      const existing = localStorage.getItem(DEVICE_KEY);
      if (existing)
        return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    } catch {
      return 'no-storage';
    }
  }

  private lockLocally(): void {
    if (!this.loggedIn())
      return;
    this.token = null;
    this.unlocked.set(false);
    clearTimeout(this.renewTimer);
    // Only a tab inside the app is sent to the PIN screen (and comes back to the same screen after it); the public /khata page and the login page stay where they are.
    if (this.router.url.startsWith('/khata/app'))
      void this.router.navigate(['/khata/unlock'], { queryParams: { next: this.router.url } });
  }

  private onVisibility(): void {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = Date.now();
      return;
    }
    if (this.unlocked() && this.hiddenAt && Date.now() - this.hiddenAt > LOCK_AFTER_MS)
      this.lock();
    this.hiddenAt = 0;
  }

  private listenToTabs(): void {
    if (!('BroadcastChannel' in window))
      return;
    this.channel = new BroadcastChannel(CHANNEL);
    this.channel.onmessage = (event: MessageEvent<KhataTabMessage>) => this.onTabMessage(event.data);
  }

  /** Renews the unlocked token shortly before it runs out, while the app is in use. A hidden app is left to run out (it locks on return). */
  private scheduleRenew(): void {
    clearTimeout(this.renewTimer);
    if (!this.unlocked())
      return;
    this.renewTimer = setTimeout(() => void this.renew(), Math.max(5000, this.expiresAt - Date.now() - RENEW_BEFORE_MS));
  }

  /** One refresh at a time in this tab, and across tabs (Web Locks), because every refresh replaces the cookie. */
  private refresh(): Promise<boolean> {
    this.refreshing ??= this.refreshOnce().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async renew(): Promise<void> {
    if (document.visibilityState !== 'visible' || !this.unlocked())
      return;
    try {
      this.apply(await this.call<KhataAuthResult>('POST', '/khata/auth/renew'), true);
    } catch {
      /* call() already handled a lost session */
    }
  }

  /** A new tab asks the others for their unlocked token, so the PIN is not asked again in every open tab. */
  private askOtherTabs(): Promise<boolean> {
    if (!this.channel)
      return Promise.resolve(false);
    this.post({ type: 'hello' });
    return new Promise((resolve) => setTimeout(() => resolve(!!this.token), HELLO_WAIT_MS));
  }

  private async onSessionLost(): Promise<void> {
    this.token = null;
    if (await this.refresh()) {
      this.lockLocally();
      return;
    }
    this.clear();
    void this.router.navigateByUrl('/khata/login');
  }

  private post(message: KhataTabMessage): void {
    this.channel?.postMessage(message);
  }

  private async refreshOnce(): Promise<boolean> {
    const run = async () => {
      try {
        this.apply(await this.auth('/khata/auth/refresh', {}), false);
        return true;
      } catch {
        return false;
      }
    };
    return 'locks' in navigator ? navigator.locks.request(REFRESH_LOCK, run) : run();
  }

  private onTabMessage(message: KhataTabMessage): void {
    switch (message.type) {
      case 'hello':
        if (this.unlocked() && this.token)
          this.post({ type: 'unlocked', token: this.token, expiresAt: this.expiresAt });
        break;
      case 'unlocked':
        if (message.token && message.expiresAt)
          this.adopt(message.token, message.expiresAt);
        break;
      case 'locked':
        this.lockLocally();
        break;
      case 'logout':
        this.clear();
        if (this.router.url.startsWith('/khata/'))
          void this.router.navigateByUrl('/khata/login');
        break;
    }
  }

  private adopt(token: string, expiresAt: number): void {
    this.token = token;
    this.expiresAt = expiresAt;
    this.hasPin.set(true);
    this.loggedIn.set(true);
    this.unlocked.set(true);
    this.scheduleRenew();
  }

  private apply(result: KhataAuthResult, broadcast: boolean): void {
    this.token = result.accessToken;
    this.expiresAt = Date.now() + result.expiresInSeconds * 1000;
    this.hasPin.set(result.hasPin);
    this.loggedIn.set(true);
    this.unlocked.set(result.unlocked);
    this.displayName.set(result.displayName);
    this.scheduleRenew();
    if (broadcast && result.unlocked)
      this.post({ type: 'unlocked', token: this.token, expiresAt: this.expiresAt });
  }

  private async auth(path: string, body: unknown): Promise<KhataAuthResult> {
    return this.call<KhataAuthResult>('POST', path, body);
  }

  /** Every SnapKhata request sends the refresh cookie (credentials), this device's id and the chosen language for the server's messages. */
  private init(body?: unknown, headers: Record<string, string> = {}): RequestInit {
    const base = { 'X-Khata-Device': this.deviceId(), 'Accept-Language': this.i18n.lang(), ...headers };
    const init: RequestInit = body === undefined ? { headers: base } : this.api.json(body, base);
    return { ...init, credentials: 'include' };
  }

  // #endregion
}
