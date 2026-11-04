import { AuthService } from './auth.service';
import { KhataApiService } from './khata-api.service';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { KhataLockMode, KhataPinStatus } from './models/khata.model';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const FORGOT_KEY = 'khata-pin-forgot';
const INSTALLED_QUERY = '(display-mode: standalone)';
const INSTALLED_SOURCE = 'source=khata-pwa';

/**
 * The app lock of the installed SnapKhata app (a 4-digit PIN, checked by the server). In a normal browser tab the app is never locked.
 * After the first login the user creates the PIN; then it is asked every time the app is opened again, and when it comes back after
 * Khata:Pin:LockAfterMinutes in the background. A password or code login in this run counts as unlocked. While locked the shell shows
 * the PIN screen instead of the pages, so no ledger data is loaded.
 */
@Injectable({ providedIn: 'root' })

export class KhataLockService {
  private hiddenAt = 0;
  private listening = false;
  private readonly doc = inject(DOCUMENT);
  private readonly auth = inject(AuthService);
  private readonly api = inject(KhataApiService);
  readonly mode = signal<KhataLockMode>('checking');
  readonly status = signal<KhataPinStatus | null>(null);
  readonly open = computed(() => this.mode() === 'open');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.installed())
      this.mode.set('open');
  }

  // #region Public Methods

  /** Back from "Change PIN" without changing it. */
  cancel(): void {
    if (this.mode() === 'change')
      this.mode.set('open');
  }

  /** "Change PIN" in Settings. */
  change(): void {
    if (this.open() && this.status()?.hasPin)
      this.mode.set('change');
  }

  /** Runs as an installed app (home-screen icon), not in a browser tab. */
  installed(): boolean {
    if (!this.browser)
      return false;
    const nav = navigator as Navigator & { standalone?: boolean };
    return matchMedia(INSTALLED_QUERY).matches || nav.standalone === true || location.search.includes(INSTALLED_SOURCE);
  }

  /** Asks the server for the PIN state when the shell opens and picks the screen. A failed call leaves the PIN screen up (it offers to try again). */
  async start(): Promise<void> {
    if (!this.installed()) {
      this.mode.set('open');
      return;
    }
    this.listen();
    this.mode.set('checking');
    try {
      const status = await this.api.pinStatus();
      this.status.set(status);
      this.mode.set(this.firstMode(status));
    } catch {
      this.status.set(null);
      this.mode.set('locked');
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

  async unlock(pin: string): Promise<void> {
    this.status.set(await this.api.verifyPin(pin));
    this.mode.set('open');
  }

  /** Saves a new PIN (first one, changed or reset) and opens the app. Resolves with the server's message. */
  async save(pin: string, currentPin?: string): Promise<string> {
    const saved = await this.api.setPin(pin, currentPin);
    this.status.set(saved.status);
    this.mode.set('open');
    return saved.message;
  }

  // #endregion

  // #region Private Methods

  /** Locks the open app when it comes back after LockAfterMinutes in the background. */
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
      if (this.open() && status?.hasPin && this.hiddenAt && Date.now() - this.hiddenAt >= status.lockAfterMinutes * 60000)
        this.mode.set('locked');
    });
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

  private firstMode(status: KhataPinStatus): KhataLockMode {
    if (status.hasPin && status.canReset && this.forgotten()) {
      this.remember(false);
      return 'reset';
    }
    if (!status.hasPin)
      return 'create';
    return this.auth.signedInHere() ? 'open' : 'locked';
  }

  // #endregion
}
