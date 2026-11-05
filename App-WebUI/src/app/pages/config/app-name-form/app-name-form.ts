import { LANGS } from '../../../core/site';
import { PanelNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { SettingsService } from '../../../core/settings.service';
import { Component, computed, inject, input, signal } from '@angular/core';

/**
 * The name of one app in every language (its rows of PageNames), shown in the header, the footer, the Settings page and the install manifest.
 * Super admin only (PUT /settings/app-names/{page}; the API checks the same). English is required; a Hindi or Arabic name left empty keeps the one it has.
 */
@Component({
  selector: 'app-app-name-form',
  templateUrl: './app-name-form.html',
  styleUrl: './app-name-form.scss',
})

export class AppNameForm {
  protected readonly langs = LANGS;
  protected readonly busy = signal(false);
  readonly page = input.required<string>();
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  private readonly cfg = inject(SettingsService);
  protected readonly notice = signal<PanelNotice | null>(null);
  /** The saved names (not the drafts of the page), keyed by language. */
  protected readonly names = computed(() => (this.cfg.defaults.pageNames as Record<string, Record<string, string>>)[this.page()] ?? {});

  // #region Public Methods

  async save(form: HTMLFormElement): Promise<void> {
    if (this.busy())
      return;
    const data = new FormData(form);
    const names = Object.fromEntries(LANGS.map((l) => [l.code, String(data.get(l.code) ?? '').trim()]));
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = await this.api.message('PUT', `/settings/app-names/${this.page()}`, this.api.json({ names }));
      // The header, footer and this form read the names from the settings: load them again so the new name shows everywhere at once.
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
