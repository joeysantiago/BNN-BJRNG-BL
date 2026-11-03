import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { isPlatformBrowser } from '@angular/common';
import { SettingsService } from './settings.service';
import { environment } from '../../environments/environment';
import { PageCode, PermissionAction } from './models/role.model';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { AuthResult, AuthTabMessage, AuthUser, OtpChannel, OtpRequestResult, ProfileDetails } from './models/auth.model';

const TIMEOUT = environment.timings.authCallMs;
const HELLO_WAIT_MS = environment.timings.tabHelloMs;
const CHANNEL = 'thakurg-auth';
const RENEW_BEFORE_MS = environment.timings.renewBeforeMs;
const DEVICE_KEY = 'thakurg-device';
const REFRESH_LOCK = 'thakurg-refresh';

/**
 * The common login of the whole site (e-mail and password). The access token lives in memory only; the refresh token is an HttpOnly cookie
 * the browser sends to /api/auth. A fresh tab first asks the open tabs for their token, then tries one refresh. Open tabs share login and logout.
 */
@Injectable({ providedIn: 'root' })

export class AuthService {
  private awake = false;
  private expiresAt = 0;
  private token: string | null = null;
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  readonly user = signal<AuthUser | null>(null);
  private readonly cfg = inject(SettingsService);
  private channel: BroadcastChannel | null = null;
  private restoring: Promise<boolean> | null = null;
  private refreshing: Promise<boolean> | null = null;
  private renewTimer?: ReturnType<typeof setTimeout>;
  readonly apps = computed(() => this.user()?.apps ?? []);
  readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly isSuperAdmin = computed(() => this.user()?.roleCode === 'super-admin');
  /** Any right on a Settings tab: the Settings page has something to show. */
  readonly canOpenSettings = computed(() => this.isSuperAdmin() || (this.user()?.permissions ?? []).some((p) => p.endsWith(':view')));

  constructor() {
    this.api.useAuth({ token: () => this.token, refresh: () => this.recover() });
    // The options the user switched off for themselves follow the login (and are dropped on logout).
    effect(() => this.cfg.setHidden(this.user()?.hiddenFeatures ?? []));
    if (this.browser)
      this.listenToTabs();
  }

  // #region Public Methods

  /** A random id for this browser, sent with every login call so the server can name the session. */
  deviceId(): string {
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

  /** While music plays the login is renewed even on a hidden page (locked phone), because the audio element loads its next packets with the access cookie. */
  keepAwake(on: boolean): void {
    this.awake = on;
    if (on && this.token && this.expiresAt - Date.now() < RENEW_BEFORE_MS)
      void this.recover();
  }

  /** Administrators may open every app. */
  hasApp(code: string): boolean {
    return this.isAdmin() || this.apps().includes(code);
  }

  /** Ends the session on the server and in every open tab. A tab on a page that needs the login goes to the login page. */
  async logout(): Promise<string> {
    const text = await this.api.message('POST', '/auth/logout', this.init(), TIMEOUT).catch(() => '');
    this.clear();
    this.post({ type: 'logout' });
    this.leaveGuardedPage();
    return text;
  }

  /** The profile was changed elsewhere (the Users and access panel): keep this tab and the others up to date. */
  patchUser(user: AuthUser): void {
    if (this.user()?.id !== user.id)
      return;
    // Some answers (the avatar endpoints) do not say how this session logged in; keep what is already known.
    const patched = { ...user, loginMethod: user.loginMethod || this.user()?.loginMethod };
    this.user.set(patched);
    this.post({ type: 'session', token: this.token ?? undefined, expiresAt: this.expiresAt, user: patched });
  }

  /** A fresh access token now, for example after an audio packet was refused. False when the session is over (then every tab logs out). */
  renewSession(): Promise<boolean> {
    return this.recover();
  }

  /** True when someone is logged in: from memory, from another open tab, or from the refresh cookie. Asked once per page load; browser only. */
  ensureSession(): Promise<boolean> {
    if (!this.browser)
      return Promise.resolve(false);
    if (this.token)
      return Promise.resolve(true);
    this.restoring ??= this.start();
    return this.restoring;
  }

  /** The mobile number, address and company of this account. */
  details(): Promise<ProfileDetails> {
    return this.api.send<ProfileDetails>('GET', '/auth/me/details', this.init(), TIMEOUT);
  }

  async removeAvatar(): Promise<string> {
    const res = await this.api.sendFull<AuthUser>('DELETE', '/auth/avatar', this.init(), TIMEOUT);
    this.patchUser(res.data);
    return res.message ?? '';
  }

  /**
   * Deletes the logged-in user's own account; the server ends every session and clears the login cookies. Then this tab and the others log out.
   * Unlike logout, a refusal (such as the last super admin) is thrown so the page can show it, and the user stays logged in.
   */
  async deleteAccount(): Promise<string> {
    const text = await this.api.message('DELETE', '/auth/me', this.init(), TIMEOUT);
    this.clear();
    this.post({ type: 'logout' });
    this.leaveGuardedPage();
    return text;
  }

  /** The address of a user's profile picture, or null when they have none. The file name in ?v= changes with every upload, so the browser may keep the picture. */
  avatarUrl(user: AuthUser | null): string | null {
    return user?.avatar ? this.api.url(`/auth/avatar/${user.id}?v=${encodeURIComponent(user.avatar)}`) : null;
  }

  /** Uploads a new profile picture (JPG, PNG or WebP; the server checks the size and the file). Resolves with the server's message. */
  async uploadAvatar(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const res = await this.api.sendFull<AuthUser>('PUT', '/auth/avatar', { ...this.init(), body }, TIMEOUT);
    this.patchUser(res.data);
    return res.message ?? '';
  }

  /** Saves the options of their own pages the user switched off. Resolves with the server's message. */
  async updateFeatures(hidden: string[]): Promise<string> {
    const res = await this.api.sendFull<AuthUser>('PUT', '/auth/me/features', this.init({ hidden }), TIMEOUT);
    this.patchUser(res.data);
    return res.message ?? '';
  }

  /** Saves the mobile number, address and company. Resolves with the server's message. */
  async saveDetails(details: ProfileDetails): Promise<string> {
    const res = await this.api.sendFull<ProfileDetails>('PUT', '/auth/me/details', this.init(details), TIMEOUT);
    return res.message ?? '';
  }

  /** A right of the user's role on a Settings page; a super admin has every right. The API checks the same rule. */
  can(page: PageCode, action: PermissionAction = 'view'): boolean {
    return this.isSuperAdmin() || (this.user()?.permissions ?? []).includes(`${page}:${action}`);
  }

  async login(email: string, password: string): Promise<AuthUser> {
    return this.signIn(await this.api.send<AuthResult>('POST', '/auth/login', this.init({ email, password }), TIMEOUT));
  }

  /** Saves the display name and language. Resolves with the server's message. */
  async updateProfile(displayName: string, language: string): Promise<string> {
    const res = await this.api.sendFull<AuthUser>('PUT', '/auth/me', this.init({ displayName, language }), TIMEOUT);
    this.patchUser(res.data);
    return res.message ?? '';
  }

  /** Changes the password. The server logs out every other session; this one stays. Resolves with the server's message. */
  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    return this.api.message('PUT', '/auth/me/password', this.init({ currentPassword, newPassword }), TIMEOUT);
  }

  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    return this.signIn(await this.api.send<AuthResult>('POST', '/auth/register', this.init({ email, password, displayName }), TIMEOUT));
  }

  /** Sends a one-time login code by e-mail or SMS, for an app that allows code login (SnapKhata, SnapTracker). */
  otpRequest(channel: OtpChannel, destination: string, app: string): Promise<OtpRequestResult> {
    return this.api.send<OtpRequestResult>('POST', '/auth/otp/request', this.init({ channel, destination, app }), TIMEOUT);
  }

  /** Logs in with a one-time code; the session is the same common login, limited to the apps that allow code login. */
  async otpVerify(channel: OtpChannel, destination: string, code: string, app: string): Promise<AuthUser> {
    return this.signIn(await this.api.send<AuthResult>('POST', '/auth/otp/verify', this.init({ channel, destination, code, app }), TIMEOUT));
  }

  // #endregion

  // #region Private Methods

  private clear(): void {
    this.token = null;
    this.expiresAt = 0;
    this.user.set(null);
    this.restoring = Promise.resolve(false);
    clearTimeout(this.renewTimer);
  }

  /** A route of the current page has a guard, so it needs the login. */
  private guarded(): boolean {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (route) {
      if (route.routeConfig?.canActivate?.length)
        return true;
      route = route.firstChild;
    }
    return false;
  }

  private listenToTabs(): void {
    if (!('BroadcastChannel' in window))
      return;
    this.channel = new BroadcastChannel(CHANNEL);
    this.channel.onmessage = (event: MessageEvent<AuthTabMessage>) => this.onTabMessage(event.data);
  }

  /** Renews the token shortly before it runs out, while the page is in use or music plays. A hidden, silent page is left to run out (a 401 then refreshes it). */
  private scheduleRenew(): void {
    clearTimeout(this.renewTimer);
    if (!this.browser || !this.token)
      return;
    this.renewTimer = setTimeout(() => void this.renew(), Math.max(5000, this.expiresAt - Date.now() - RENEW_BEFORE_MS));
  }

  private leaveGuardedPage(): void {
    if (this.guarded())
      void this.router.navigate(['/login'], { queryParams: { next: this.router.url } });
  }

  /** One refresh at a time in this tab, and across tabs (Web Locks), because every refresh replaces the cookie. */
  private refresh(): Promise<boolean> {
    this.refreshing ??= this.refreshOnce().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async renew(): Promise<void> {
    if ((document.visibilityState === 'visible' || this.awake) && this.token)
      await this.recover();
  }

  private async start(): Promise<boolean> {
    return (await this.askOtherTabs()) || this.refresh();
  }

  private apply(result: AuthResult): void {
    this.token = result.accessToken;
    this.expiresAt = Date.now() + result.expiresInSeconds * 1000;
    this.user.set(result.user);
    this.scheduleRenew();
    this.post({ type: 'session', token: this.token, expiresAt: this.expiresAt, user: result.user });
  }

  /** A new tab asks the others for their token, so a refresh is not needed in every open tab. */
  private askOtherTabs(): Promise<boolean> {
    if (!this.channel)
      return Promise.resolve(false);
    this.post({ type: 'hello' });
    return new Promise((resolve) => setTimeout(() => resolve(!!this.token), HELLO_WAIT_MS));
  }

  /** After a 401: refresh once. When that fails the session is over in every tab. */
  private async recover(): Promise<boolean> {
    if (await this.refresh())
      return true;
    if (this.user()) {
      this.clear();
      this.post({ type: 'logout' });
      this.leaveGuardedPage();
    }
    return false;
  }

  /** Every login call sends the cookies (credentials), this browser's id and the chosen language for the server's messages. */
  private init(body?: unknown): RequestInit {
    const headers = { 'X-Device': this.deviceId(), 'Accept-Language': this.i18n.lang() };
    const init: RequestInit = body === undefined ? { headers } : this.api.json(body, headers);
    return { ...init, credentials: 'include' };
  }

  private post(message: AuthTabMessage): void {
    this.channel?.postMessage(message);
  }

  /** A login or sign-up: the account's language becomes the site language. */
  private signIn(result: AuthResult): AuthUser {
    this.apply(result);
    const lang = result.user.language;
    if (lang === 'en' || lang === 'hi' || lang === 'ar')
      this.i18n.set(lang);
    return result.user;
  }

  private async refreshOnce(): Promise<boolean> {
    const run = async () => {
      try {
        this.apply(await this.api.send<AuthResult>('POST', '/auth/refresh', this.init(), TIMEOUT));
        return true;
      } catch {
        return false;
      }
    };
    return 'locks' in navigator ? navigator.locks.request(REFRESH_LOCK, run) : run();
  }

  private onTabMessage(message: AuthTabMessage): void {
    switch (message.type) {
      case 'hello':
        if (this.token)
          this.post({ type: 'session', token: this.token, expiresAt: this.expiresAt, user: this.user() ?? undefined });
        break;
      case 'session':
        if (message.token && message.expiresAt && message.user)
          this.adopt(message.token, message.expiresAt, message.user);
        break;
      case 'logout':
        if (this.user()) {
          this.clear();
          this.leaveGuardedPage();
        }
        break;
    }
  }

  private adopt(token: string, expiresAt: number, user: AuthUser): void {
    this.token = token;
    this.expiresAt = expiresAt;
    this.user.set(user);
    this.scheduleRenew();
  }

  // #endregion
}
