import { KhataIcon } from '../khata-icon/khata-icon';
import { AuthService } from '../../../../core/auth.service';
import { I18nService } from '../../../../core/i18n.service';
import { KhataUiService } from '../../../../core/khata-ui.service';
import { KhataPinStep } from '../../../../core/models/khata.model';
import { KhataLockService } from '../../../../core/khata-lock.service';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TITLES: Record<KhataPinStep, string> = { unlock: 'khata.lock.unlockTitle', current: 'khata.lock.currentTitle', new: 'khata.lock.newTitle', confirm: 'khata.lock.confirmTitle' };

/**
 * The PIN screen of the installed app, shown by the shell instead of the pages: unlock with the PIN, create the first PIN after login,
 * change it from Settings (current, new, again) or choose a new one after "Forgot PIN?". A keypad with big keys, and the keyboard's digits.
 */
@Component({
  selector: 'app-khata-lock',
  templateUrl: './khata-lock.html',
  host: { '(document:keydown)': 'key($event)' },
  imports: [KhataIcon],
})

export class KhataLock {
  protected readonly keys = KEYS;
  private chosen: string | undefined;
  private current: string | undefined;
  protected readonly error = signal('');
  protected readonly digits = signal('');
  protected readonly busy = signal(false);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(KhataUiService);
  protected readonly i18n = inject(I18nService);
  protected readonly lock = inject(KhataLockService);
  protected readonly step = signal<KhataPinStep>('unlock');
  protected readonly length = computed(() => this.lock.status()?.length ?? 4);
  protected readonly dots = computed(() => Array.from({ length: this.length() }, (_, i) => i < this.digits().length));
  /** The heading's translation key for the step (a first PIN and a new one read differently). */
  protected readonly title = computed(() => (this.step() === 'new' && this.lock.mode() === 'create' ? 'khata.lock.createTitle' : TITLES[this.step()]));

  constructor() {
    // Every time the screen's purpose changes (locked, create, change, reset) it starts again at its first step.
    effect(() => {
      const mode = this.lock.mode();
      const status = this.lock.status();
      untracked(() => this.reset(mode === 'locked' ? 'unlock' : mode === 'change' && !status?.canReset ? 'current' : 'new'));
    });
  }

  // #region Public Methods

  back(): void {
    if (!this.busy())
      this.digits.update((d) => d.slice(0, -1));
  }

  async retry(): Promise<void> {
    this.error.set('');
    await this.lock.start();
  }

  /** The keyboard's digits and Backspace work like the keypad. */
  key(ev: KeyboardEvent): void {
    if (ev.ctrlKey || ev.metaKey || ev.altKey)
      return;
    if (/^\d$/.test(ev.key)) {
      ev.preventDefault();
      void this.press(ev.key);
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      this.back();
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async forgot(): Promise<void> {
    await this.lock.forgot();
  }

  async press(digit: string): Promise<void> {
    if (this.busy() || this.digits().length >= this.length())
      return;
    this.error.set('');
    this.digits.update((d) => d + digit);
    if (this.digits().length === this.length())
      await this.complete(this.digits());
  }

  // #endregion

  // #region Private Methods

  /** The same rule as the server: not every digit the same (1111) and not one straight run (1234, 9876). */
  private weak(pin: string): boolean {
    const steps = new Set([...pin].slice(1).map((d, i) => Number(d) - Number(pin[i])));
    const [only] = [...steps];
    return steps.size === 1 && Math.abs(only) <= 1;
  }

  private reset(step: KhataPinStep): void {
    this.step.set(step);
    this.digits.set('');
    this.current = undefined;
    this.chosen = undefined;
  }

  private async complete(pin: string): Promise<void> {
    switch (this.step()) {
      case 'unlock':
        await this.run(() => this.lock.unlock(pin), 'unlock');
        break;
      case 'current':
        this.current = pin;
        this.step.set('new');
        this.digits.set('');
        break;
      case 'new':
        if (this.weak(pin))
          this.fail(this.i18n.t('khata.lock.weak'), 'new');
        else {
          this.chosen = pin;
          this.step.set('confirm');
          this.digits.set('');
        }
        break;
      case 'confirm':
        if (pin !== this.chosen)
          this.fail(this.i18n.t('khata.lock.mismatch'), 'new');
        else
          await this.run(async () => this.ui.notify(await this.lock.save(pin, this.current)), this.current ? 'current' : 'new');
        break;
    }
  }

  private fail(message: string, step: KhataPinStep): void {
    const current = this.current;
    this.reset(step);
    this.current = step === 'current' ? undefined : current;
    this.error.set(message);
  }

  /** On a refusal (wrong PIN, locked for a while) the digits are cleared and the screen goes back to `step`. */
  private async run(work: () => Promise<void>, step: KhataPinStep): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } catch (e) {
      this.fail((e as Error).message, step);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
