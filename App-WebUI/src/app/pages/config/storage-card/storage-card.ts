import { PanelNotice } from '../config.model';
import { StorageSetting } from './storage-card.model';
import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * Settings > General > File storage (super admin, password login; the API checks the same): one switch for where every app keeps its files, the App-Data
 * folder or the Azure Blob container (under this environment's folder). Saved as soon as it is picked. Files are read only from the chosen store, so the
 * copy buttons move every file of the other store across first. The Azure connection string comes from the server's AzureStorageConnectionString setting.
 */
@Component({
  selector: 'app-storage-card',
  imports: [ChoiceGroup],
  templateUrl: './storage-card.html',
  styleUrl: './storage-card.scss',
})

export class StorageCard {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly notice = signal<PanelNotice | null>(null);
  protected readonly setting = signal<StorageSetting | null>(null);
  protected readonly providers = computed<ChoiceOption[]>(() => ['local', 'azure'].map((p) => ({ value: p, label: this.i18n.t('gen.store.' + p) })));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(): Promise<void> {
    await this.run(() => this.api.message('POST', '/admin/storage/test'));
  }

  // Copying every song and picture can take minutes, so the request may run for up to ten.
  async copy(target: string): Promise<void> {
    await this.run(() => this.api.message('POST', `/admin/storage/copy/${target}`, {}, 600000));
  }

  async pick(provider: string): Promise<void> {
    await this.run(async () => {
      const res = await this.api.sendFull<StorageSetting>('PUT', '/admin/storage', this.api.json({ provider }));
      this.setting.set(res.data);
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.setting.set(await this.api.get<StorageSetting>('/admin/storage'));
    } catch (e) {
      this.error.set((e as Error).message);
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
