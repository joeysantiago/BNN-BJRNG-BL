import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { KhataApiService } from '../../../core/khata-api.service';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { KhataNotice, KhataPinStatus, KhataStorage, KhataStorageProvider } from '../../../core/models/khata.model';

/** The line icons of the two places bill photos can be kept (fixed drawings). */
const SERVER_ICON = ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'];
const CLOUD_ICON = ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'];

/**
 * SnapKhata's own part of Settings > General (FEATURE_SETTINGS), for a user who may open SnapKhata. Whether SnapKhata sends notifications at all (each party's
 * channels are on that party's settings); "Change PIN" where this session is protected by the app lock (the PIN screen opens inside the app); and, for a super admin
 * who logged in with a password, where the site keeps bill photos (local or Azure Blob). The API checks the same. Theme, language, mail and users are shared tabs.
 */
@Component({
  selector: 'app-khata-settings-panel',
  imports: [RouterLink, ChoiceGroup],
  templateUrl: './khata-settings-panel.html',
  styleUrl: './khata-settings-panel.scss',
})

export class KhataSettingsPanel {
  protected readonly busy = signal(false);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  protected readonly notice = signal<KhataNotice | null>(null);
  protected readonly pin = signal<KhataPinStatus | null>(null);
  protected readonly storage = signal<KhataStorage | null>(null);
  protected readonly notifications = signal<boolean | null>(null);
  protected readonly provider = signal<KhataStorageProvider>('local');
  /** Only a super admin whose session logged in with a password may change where the site keeps files. */
  protected readonly canStorage = computed(() => this.auth.isSuperAdmin() && this.auth.user()?.loginMethod !== 'otp');
  /** Where bill photos are kept: this server or Azure Blob Storage. */
  protected readonly providers = computed<ChoiceOption[]>(() => [{ value: 'local', label: this.i18n.t('khata.st.local'), icon: SERVER_ICON }, { value: 'azure', label: this.i18n.t('khata.st.azure'), icon: CLOUD_ICON }]);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async testStorage(): Promise<void> {
    await this.run(() => this.api.testStorage());
  }

  async saveStorage(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (key: string): string => String(data.get(key) ?? '').trim();
    const request = { provider: this.provider(), enabled: data.get('enabled') === 'on', accountName: text('accountName'), containerName: text('containerName'), connectionString: text('connectionString') || undefined };
    await this.run(async () => {
      const message = await this.api.saveStorage(request);
      this.storage.set(await this.api.storage());
      (form.elements.namedItem('connectionString') as HTMLInputElement | null)?.setAttribute('value', '');
      return message;
    });
  }

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
      if (this.canStorage()) {
        const storage = await this.api.storage();
        this.storage.set(storage);
        this.provider.set(storage.provider);
      }
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
