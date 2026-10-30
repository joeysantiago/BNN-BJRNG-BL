import { I18nService } from '../../../core/i18n.service';
import { Component, computed, inject, input, model, output } from '@angular/core';

/** PIN number pad: dots instead of digits, big keys (44 px+), and the physical keyboard works too (digits, Backspace, Enter). */
@Component({
  selector: 'app-khata-keypad',
  templateUrl: './khata-keypad.html',
  styleUrl: './khata-keypad.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})

export class KhataKeypad {
  readonly max = input(6);
  readonly value = model('');
  readonly enter = output<void>();
  readonly disabled = input(false);
  protected readonly i18n = inject(I18nService);
  protected readonly digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly slots = computed(() => Array.from({ length: this.max() }, (_, i) => i));

  // #region Public Methods

  back(): void {
    if (!this.disabled())
      this.value.update((v) => v.slice(0, -1));
  }

  press(digit: string): void {
    if (!this.disabled() && this.value().length < this.max())
      this.value.update((v) => v + digit);
  }

  onKey(event: KeyboardEvent): void {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select'))
      return;
    if (/^\d$/.test(event.key))
      this.press(event.key);
    else if (event.key === 'Backspace')
      this.back();
    else if (event.key === 'Enter')
      this.enter.emit();
  }

  // #endregion
}
