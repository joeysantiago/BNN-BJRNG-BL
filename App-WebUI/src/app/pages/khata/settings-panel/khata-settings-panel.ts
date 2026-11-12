import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { KhataApiService } from '../../../core/khata-api.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { KhataNotice, KhataPinStatus } from '../../../core/models/khata.model';

/**
 * SnapKhata's own part of Settings > General (FEATURE_SETTINGS), for a user who may open SnapKhata. Whether SnapKhata sends notifications at all (each party's
 * channels are on that party's settings), and "Change PIN" where this session is protected by the app lock (the PIN screen opens inside the app). Where bill
 * photos are kept is the site's file storage (Settings > Keys). Theme, language, mail and users are shared tabs.
 */
@Component({
  selector: 'app-khata-settings-panel',
  imports: [RouterLink],
  templateUrl: './khata-settings-panel.html',
  styleUrl: './khata-settings-panel.scss',
})

export class KhataSettingsPanel {
  protected readonly busy = signal(false);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  protected readonly notice = signal<KhataNotice | null>(null);
  protected readonly pin = signal<KhataPinStatus | null>(null);
  protected readonly notifications = signal<boolean | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async toggleNotifications(box: HTMLInputElement): Promise<void> {
    const on = box.checked;
    await this.run(async () => {
      const text = await this.api.saveSettings(on);
      this.notifications.set(on);
      return text;
    });
    box.checked = this.notifications() ?? false;
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      const [settings, pin] = await Promise.all([this.api.settings(), this.api.pinStatus()]);
      this.notifications.set(settings.notificationsEnabled);
      this.pin.set(pin);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private async run(work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
