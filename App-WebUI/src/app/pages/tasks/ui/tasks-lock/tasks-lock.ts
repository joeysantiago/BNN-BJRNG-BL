import { TaskIcon } from '../task-icon/task-icon';
import { AuthService } from '../../../../core/auth.service';
import { I18nService } from '../../../../core/i18n.service';
import { TaskPinStep } from '../../../../core/models/tasks.model';
import { TasksLockService } from '../../../../core/tasks-lock.service';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { Component, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';

/**
 * The App Lock screen of My Tasks (the same keypad as SnapKhata): unlock with the PIN, or the PIN flows of Settings: turn the lock on (new PIN, confirm),
 * change it (current PIN unless the login is fresh, new, confirm) or turn it off (current PIN). Digits can also be typed on a keyboard.
 */
@Component({
  selector: 'app-tasks-lock',
  imports: [TaskIcon],
  templateUrl: './tasks-lock.html',
  styleUrl: './tasks-lock.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown)': 'key($event)' },
})

export class TasksLock {
  private readonly current = signal('');
  protected readonly error = signal('');
  protected readonly first = signal('');
  protected readonly busy = signal(false);
  protected readonly entered = signal('');
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly state = inject(TasksStateService);
  protected readonly lock = inject(TasksLockService);
  protected readonly step = signal<TaskPinStep>('unlock');
  protected readonly appName = computed(() => this.i18n.page('tasks'));
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly length = computed(() => this.lock.status()?.length ?? 4);
  protected readonly dots = computed(() => Array.from({ length: this.length() }, (_, i) => i < this.entered().length));
  protected readonly lead = computed(() => {
    const mode = this.lock.mode();
    if (this.step() === 'unlock')
      return this.i18n.t('tasks.lock.unlockLead');
    if (mode === 'remove')
      return this.i18n.t('tasks.lock.removeLead');
    return this.i18n.t('tasks.lock.createLead', { n: this.length() });
  });
  protected readonly heading = computed(() => {
    const mode = this.lock.mode();
    if (this.step() === 'unlock')
      return this.appName();
    if (this.step() === 'current')
      return this.i18n.t('tasks.lock.currentTitle');
    if (this.step() === 'confirm')
      return this.i18n.t('tasks.lock.confirmTitle');
    return this.i18n.t(mode === 'create' ? 'tasks.lock.createTitle' : 'tasks.lock.newTitle');
  });

  /** The screen follows the lock: when the mode changes (checking, locked, a Settings flow) it starts again at its first step. */
  constructor() {
    effect(() => {
      this.lock.mode();
      untracked(() => {
        this.step.set(this.firstStep());
        this.entered.set('');
        this.current.set('');
        this.first.set('');
        this.error.set('');
      });
    });
  }

  // #region Public Methods

  back(): void {
    this.entered.update((v) => v.slice(0, -1));
    this.error.set('');
  }

  press(digit: string): void {
    if (this.busy() || this.entered().length >= this.length())
      return;
    this.error.set('');
    this.entered.update((v) => v + digit);
    if (this.entered().length === this.length())
      void this.submit();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  key(event: KeyboardEvent): void {
    if (this.lock.mode() === 'checking')
      return;
    if (/^[0-9]$/.test(event.key))
      this.press(event.key);
    else if (event.key === 'Backspace')
      this.back();
    else if (event.key === 'Escape' && this.lock.mode() !== 'locked')
      this.lock.cancel();
  }

  // #endregion

  // #region Private Methods

  private firstStep(): TaskPinStep {
    const mode = this.lock.mode();
    if (mode === 'locked')
      return 'unlock';
    if (mode === 'remove' || (mode === 'change' && !this.lock.status()?.canReset))
      return 'current';
    return 'new';
  }

  /** All the same digit, or a straight run (1234, 9876): the server refuses them too. */
  private weak(pin: string): boolean {
    const steps = new Set([...pin].slice(1).map((d, i) => Number(d) - Number(pin[i])));
    return steps.size === 1 && [0, 1, -1].includes([...steps][0]);
  }

  private fail(message: string): void {
    this.error.set(message);
    this.entered.set('');
  }

  private async submit(): Promise<void> {
    const pin = this.entered();
    this.busy.set(true);
    try {
      switch (this.step()) {
        case 'unlock':
          await this.lock.unlock(pin);
          break;
        case 'current':
          if (this.lock.mode() === 'remove') {
            this.state.toast(await this.lock.remove(pin));
            break;
          }
          this.current.set(pin);
          this.entered.set('');
          this.step.set('new');
          break;
        case 'new':
          if (this.weak(pin)) {
            this.fail(this.i18n.t('tasks.lock.weak'));
            break;
          }
          this.first.set(pin);
          this.entered.set('');
          this.step.set('confirm');
          break;
        case 'confirm':
          if (pin !== this.first()) {
            this.step.set('new');
            this.fail(this.i18n.t('tasks.lock.mismatch'));
            break;
          }
          this.state.toast(await this.lock.save(pin, this.current() || null));
          break;
      }
    } catch (e) {
      if (this.step() === 'confirm')
        this.step.set(this.lock.mode() === 'change' && !this.lock.status()?.canReset ? 'current' : 'new');
      this.fail((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
