import { PanelNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { SettingsService } from '../../../core/settings.service';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { Component, computed, inject, signal } from '@angular/core';

/**
 * Where the code that checks a new sign-up goes (super admin; PUT /settings/signup-verification, the API checks the same): by e-mail, or to the mobile number by
 * WhatsApp or SMS, which also makes the sign-up ask for that number. Saved as soon as it is picked.
 */
@Component({
  selector: 'app-signup-card',
  imports: [ChoiceGroup],
  templateUrl: './signup-card.html',
  styleUrl: './signup-card.scss',
})

export class SignupCard {
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  protected readonly notice = signal<PanelNotice | null>(null);
  protected readonly channels = computed<ChoiceOption[]>(() => ['email', 'whatsapp', 'sms'].map((c) => ({ value: c, label: this.i18n.t('cfg.signup.' + c) })));

  // #region Public Methods

  async pick(channel: string): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = await this.api.message('PUT', '/settings/signup-verification', this.api.json({ channel }));
      // The sign-up form reads it from the settings: load them again so it applies at once.
      await this.cfg.load();
      this.notice.set({ text, error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
