import { KhataKeypad } from '../keypad/khata-keypad';
import { I18nService } from '../../../core/i18n.service';
import { KhataSessionService } from '../../../core/khata-session.service';
import { KhataPinPromptService } from '../../../core/khata-pin-prompt.service';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';

const MIN_PIN = 4;

/** Modal PIN sheet for risky actions. The PIN is checked by the API, which returns a single-use proof for that one action. */
@Component({
  selector: 'app-khata-pin-sheet',
  imports: [KhataKeypad],
  templateUrl: './khata-pin-sheet.html',
  styleUrl: './khata-pin-sheet.scss',
})

export class KhataPinSheet {
  protected readonly minPin = MIN_PIN;
  protected readonly pin = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly i18n = inject(I18nService);
  private readonly session = inject(KhataSessionService);
  protected readonly prompt = inject(KhataPinPromptService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog)
        return;
      if (this.prompt.request() && !dialog.open) {
        this.pin.set('');
        this.error.set('');
        dialog.showModal();
      } else if (!this.prompt.request() && dialog.open) {
        dialog.close();
      }
    });
  }

  // #region Public Methods

  cancel(): void {
    this.prompt.finish(null);
  }

  async confirm(): Promise<void> {
    const request = this.prompt.request();
    if (!request || this.busy() || this.pin().length < MIN_PIN)
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.prompt.finish(await this.session.proof(request.purpose, this.pin(), request.targetId));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.pin.set('');
      this.busy.set(false);
    }
  }

  // #endregion
}
