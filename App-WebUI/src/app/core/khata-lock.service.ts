import { Router } from '@angular/router';
import { isNativeApp } from './native-app';
import { AuthService } from './auth.service';
import { KhataApiService } from './khata-api.service';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { KhataLockMode, KhataPinStatus } from './models/khata.model';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';

const SHELL = '/khata/app';
const FORGOT_KEY = 'khata-pin-forgot';
const INSTALLED_QUERY = '(display-mode: standalone)';
const INSTALLED_SOURCE = 'source=khata-pwa';

/**
 * The app lock of the installed SnapKhata app (a 4-digit PIN). The server enforces it: when the installed app opens it locks its login
 * session there (POST pin/lock), and while that session is locked every ledger call is refused (423) until the PIN is entered. The server
 * also locks it after Khata:Pin:LockAfterMinutes without a call, so the open app keeps it alive while it is on screen. After the first
 * login the user creates the PIN; a password or code login in this run counts as unlocked. A browser tab that shares a locked session
 * (same phone) is locked too. While locked the shell shows the PIN screen instead of the pages, and the shared pages outside the shell
 * (/profile, /master) are closed: a lock that comes while one of them is open brings the user back to the PIN screen.
 */
@Injectable({ providedIn: 'root' })

export class KhataLockService {
  private hiddenAt = 0;
  private listening = false;
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  /** Set once the shell has started the lock in this login; until then nothing is held behind it. */
  private readonly started = signal(false);
  private readonly auth = inject(AuthService);
  private readonly api = inject(KhataApiService);
  readonly mode = signal<KhataLockMode>('checking');
  readonly status = signal<KhataPinStatus | null>(null);
  readonly open = computed(() => this.mode() === 'open');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  /** The lock is up (PIN screen, checking, create, change or reset): only the PIN screen may be used. */
  readonly blocked = computed(() => this.started() && !this.open());
  /** "Change PIN" in Settings: only where this session is protected by the app lock. */
  readonly canChange = computed(() => !!this.status()?.hasPin && !!this.status()?.protected);

  constructor() {
    if (!this.installed())
      this.mode.set('open');
    // A ledger call was refused because the session is locked on the server: show the PIN screen.
    effect(() => {
      if (this.api.pinRequired())
        untracked(() => void this.relock());
    });
    // The lock came up while a page outside the shell (/profile, /master) is open: go back to the shell, which shows the PIN screen.
    effect(() => {
      if (this.blocked())
        untracked(() => this.toShell());
    });
    // A logout ends the lock of that login; the next login starts it again in the shell.
    effect(() => {
      if (!this.auth.user())
        untracked(() => this.started.set(false));
    });
  }

  // #region Public Methods

  /** Back from "Change PIN" without changing it. */
  cancel(): void {
    if (this.mode() === 'change')
      this.mode.set('open');
  }

  /** "Change PIN" in Settings. */
  change(): void {
    if (this.open() && this.canChange())
      this.mode.set('change');
  }

  /** Runs as an installed app (home-screen icon, or the Android app, whose WebView never reports display-mode standalone), not in a browser tab. */
  installed(): boolean {
    if (!this.browser)
      return false;
    const nav = navigator as Navigator & { standalone?: boolean };
    return isNativeApp() || matchMedia(INSTALLED_QUERY).matches || nav.standalone === true || location.search.includes(INSTALLED_SOURCE);
  }

  /**
   * When the shell opens. The installed app locks its session on the server (kept open only right after a login) and shows the PIN screen;
   * a browser tab only asks whether its session is locked. A failed call leaves the installed app on the PIN screen (it offers to try again).
   */
  async start(): Promise<void> {
    const installed = this.installed();
    if (!this.browser)
      return;
    // A lock that is already up in this login (the shell opened again, e.g. after a click on Profile or Settings) stays up until the PIN is entered.
    const held = this.blocked() && this.mode() !== 'checking' ? this.mode() : null;
    this.listen();
    this.started.set(true);
    if (installed)
      this.mode.set('checking');
    try {
      const status = installed ? await this.api.lockPin(this.auth.signedInHere() && !held) : await this.api.pinStatus();
      this.status.set(status);
      this.mode.set(held ? this.heldMode(held, status) : this.firstMode(status, installed));
    } catch {
      this.status.set(null);
      this.mode.set(installed || held ? 'locked' : 'open');
    }
  }

  /**
   * "Forgot PIN?": right after a login a new PIN can be chosen at once; otherwise the user logs out, logs in again (password or code)
   * and is then asked for a new PIN.
   */
  async forgot(): Promise<void> {
    if (this.status()?.canReset) {
      this.mode.set('reset');
      return;
    }
    this.remember(true);
    await this.auth.logout();
  }

  /** Checks the PIN on the server, which unlocks this session. */
  async unlock(pin: string): Promise<void> {
    this.status.set(await this.api.verifyPin(pin));
    this.mode.set('open');
  }

  /** Saves a new PIN (first one, changed or reset), which also unlocks this session, and opens the app. Resolves with the server's message. */
  async save(pin: string, currentPin?: string): Promise<string> {
    const saved = await this.api.setPin(pin, currentPin);
    this.status.set(saved.status);
    this.mode.set('open');
    return saved.message;
  }

  // #endregion

  // #region Private Methods

  /**
   * Locks the open app when it comes back after LockAfterMinutes in the background, and while it is on screen tells the server it is
   * still in use every half LockAfterMinutes, so reading one page for a while does not lock it.
   */
  private listen(): void {
    if (this.listening)
      return;
    this.listening = true;
    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'hidden') {
        this.hiddenAt = Date.now();
        return;
      }
      const status = this.status();
      if (this.open() && status?.protected && this.hiddenAt && Date.now() - this.hiddenAt >= status.lockAfterMinutes * 60000)
        this.mode.set('locked');
    });
    this.keepAlive();
  }

  private toShell(): void {
    if (!this.router.url.startsWith(SHELL))
      void this.router.navigateByUrl(SHELL, { replaceUrl: true });
  }

  private keepAlive(): void {
    setTimeout(() => {
      if (this.open() && this.status()?.protected && this.doc.visibilityState === 'visible')
        void this.api.keepPin().then((status) => this.status.set(status), () => null);
      this.keepAlive();
    }, (this.status()?.lockAfterMinutes ?? 1) * 30000);
  }

  private forgotten(): boolean {
    try {
      return sessionStorage.getItem(FORGOT_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** Session storage keeps the "Forgot PIN?" choice across the logout and the new login. */
  private remember(on: boolean): void {
    try {
      if (on)
        sessionStorage.setItem(FORGOT_KEY, '1');
      else
        sessionStorage.removeItem(FORGOT_KEY);
    } catch {
      // No storage (private mode): the user is asked for the old PIN again and can use "Forgot PIN?" once more.
    }
  }

  /** The server refused a call because this session is locked: ask it again and show the PIN screen (or "create" when there is no PIN). */
  private async relock(): Promise<void> {
    if (!this.open())
      return;
    try {
      const status = await this.api.pinStatus();
      this.status.set(status);
      this.mode.set(status.hasPin ? 'locked' : 'create');
    } catch {
      this.status.set(null);
      this.mode.set('locked');
    }
  }

  private firstMode(status: KhataPinStatus, installed: boolean): KhataLockMode {
    if (status.hasPin && status.canReset && this.forgotten()) {
      this.remember(false);
      return 'reset';
    }
    if (installed && !status.hasPin)
      return 'create';
    if (!status.locked)
      return 'open';
    return status.hasPin ? 'locked' : 'create';
  }

  /** The lock that was up before the shell opened again: the same PIN step, never "open" ("create" only when there is no PIN). */
  private heldMode(held: KhataLockMode, status: KhataPinStatus): KhataLockMode {
    if (!status.hasPin)
      return 'create';
    return held === 'create' ? 'locked' : held;
  }

  // #endregion
}
