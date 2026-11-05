import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { TasksApiService } from './tasks-api.service';
import { TaskLockMode, TaskPinStatus } from './models/tasks.model';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';

/**
 * The App Lock of My Tasks, the same mechanism as SnapKhata's but its own PIN and state (turning one on or off never changes the other).
 * When a PIN is set, the server refuses every task call of a login session until the PIN is entered; this service shows the lock screen at every
 * start of the app, after the app was in the background for the user's "lock after" time, and whenever the server answers 423. While the app is open and
 * visible it keeps the session open (keep) every half of that time.
 */
@Injectable({ providedIn: 'root' })

export class TasksLockService {
  private hiddenAt = 0;
  private listening = false;
  private readonly auth = inject(AuthService);
  private timer?: ReturnType<typeof setTimeout>;
  private readonly api = inject(TasksApiService);
  readonly mode = signal<TaskLockMode>('checking');
  readonly status = signal<TaskPinStatus | null>(null);
  readonly open = computed(() => this.mode() === 'open');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly enabled = computed(() => this.status()?.hasPin ?? false);

  constructor() {
    effect(() => {
      if (this.api.pinRequired() > 0)
        untracked(() => void this.relock());
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
