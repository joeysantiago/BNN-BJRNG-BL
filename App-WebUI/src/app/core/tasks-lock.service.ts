import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { TasksApiService } from './tasks-api.service';
import { TaskLockMode, TaskPinStatus } from './models/tasks.model';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';

const SHELL = '/tasks/app';

/**
 * The App Lock of My Tasks, the same mechanism as SnapKhata's but its own PIN and state (turning one on or off never changes the other).
 * When a PIN is set, the server refuses every task call of a login session until the PIN is entered; this service shows the lock screen at every
 * start of the app, after the app was in the background for the user's "lock after" time, and whenever the server answers 423. While the app is open and
 * visible it keeps the session open (keep) every half of that time. While locked the shared pages outside the shell (/profile, /master) are closed:
 * a lock that comes while one of them is open brings the user back to the PIN screen.
 */
@Injectable({ providedIn: 'root' })

export class TasksLockService {
  private hiddenAt = 0;
  private listening = false;
  private readonly router = inject(Router);
  /** Set once the shell has started the lock in this login; until then nothing is held behind it. */
  private readonly started = signal(false);
  private readonly auth = inject(AuthService);
  private timer?: ReturnType<typeof setTimeout>;
  private readonly api = inject(TasksApiService);
  readonly mode = signal<TaskLockMode>('checking');
  readonly status = signal<TaskPinStatus | null>(null);
  readonly open = computed(() => this.mode() === 'open');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly enabled = computed(() => this.status()?.hasPin ?? false);
  /** The lock is up (PIN screen, checking, create, change or remove): only the PIN screen may be used. */
  readonly blocked = computed(() => this.started() && !this.open());

  constructor() {
    effect(() => {
      if (this.api.pinRequired() > 0)
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

  cancel(): void {
    this.mode.set('open');
  }

  /** Every start of the app is locked when a PIN is set (as in SnapKhata), so a reload or a new tab never skips the PIN. */
  async start(): Promise<void> {
    if (!this.browser)
      return;
    this.listen();
    this.started.set(true);
    try {
      const status = await this.api.lockPin();
      this.status.set(status);
      this.mode.set(status.hasPin ? 'locked' : 'open');
    } catch {
      this.mode.set('open');
    }
    this.keepAlive();
  }

  /** A forgotten PIN: right after a login a new one can be set; otherwise the user logs in again (which allows it). */
  async forgot(): Promise<void> {
    if (this.status()?.canReset) {
      this.mode.set('create');
      return;
    }
    await this.auth.logout();
  }

  async lockNow(): Promise<void> {
    const status = await this.api.lockPin();
    this.status.set(status);
    this.mode.set(status.hasPin ? 'locked' : 'open');
  }

  async unlock(pin: string): Promise<void> {
    this.status.set(await this.api.verifyPin(pin));
    this.mode.set('open');
  }

  async remove(pin: string): Promise<string> {
    const res = await this.api.removePin(pin);
    this.status.set(res.data);
    this.mode.set('open');
    return res.message ?? '';
  }

  /** Opens one of the PIN flows of Settings on the lock screen. */
  begin(mode: 'create' | 'change' | 'remove'): void {
    this.mode.set(mode);
  }

  async save(pin: string, currentPin: string | null): Promise<string> {
    const res = await this.api.setPin(pin, currentPin);
    this.status.set(res.data);
    this.mode.set('open');
    return res.message ?? '';
  }

  // #endregion

  // #region Private Methods

  private listen(): void {
    if (this.listening)
      return;
    this.listening = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenAt = Date.now();
        return;
      }
      const status = this.status();
      if (status?.hasPin && this.open() && Date.now() - this.hiddenAt >= status.lockAfterMinutes * 60000)
        void this.lockNow().catch(() => this.mode.set('locked'));
    });
  }

  private toShell(): void {
    if (!this.router.url.startsWith(SHELL))
      void this.router.navigateByUrl(SHELL, { replaceUrl: true });
  }

  private keepAlive(): void {
    clearTimeout(this.timer);
    const minutes = Math.max(1, this.status()?.lockAfterMinutes ?? 1);
    this.timer = setTimeout(() => {
      if (this.enabled() && this.open() && document.visibilityState === 'visible')
        void this.api.keepPin().catch(() => undefined);
      this.keepAlive();
    }, minutes * 30000);
  }

  private async relock(): Promise<void> {
    try {
      const status = await this.api.pinStatus();
      this.status.set(status);
      this.mode.set(status.locked ? 'locked' : 'open');
    } catch {
      this.mode.set('open');
    }
  }

  // #endregion
}
