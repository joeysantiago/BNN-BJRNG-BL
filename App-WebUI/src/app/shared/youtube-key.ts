import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { KeyStatus } from '../core/models/key-status.model';
import { Component, afterNextRender, inject, signal } from '@angular/core';

/**
 * Asks for the YouTube Data API key the first time, and only then. The key is sent to the API, which checks it with Google and stores it in the
 * database (needs the master key). Nothing is kept in the browser: once the database has a key, this card never shows again.
 */
@Component({
  selector: 'app-youtube-key',
  templateUrl: './youtube-key.html',
  styleUrl: './youtube-key.scss',
})

export class YoutubeKey {
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly needed = signal(false);
  protected readonly i18n = inject(I18nService);
  protected readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.check());
  }

  // #region Private Methods

  protected skip(): void {
    this.needed.set(false);
  }

  private async check(): Promise<void> {
    try {
      this.needed.set(!(await this.api.get<KeyStatus>('/youtube/key')).isSet);
    } catch {
      this.needed.set(false);
    }
  }

  protected async save(ev: Event, key: HTMLInputElement, master: HTMLInputElement): Promise<void> {
    ev.preventDefault();
    if (this.busy())
      return;
    if (!key.value.trim() || !master.value.trim())
      return this.error.set(this.i18n.t('yt.key.missing'));
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.message('POST', '/youtube/key', this.api.json({ apiKey: key.value.trim() }, { 'X-Master-Key': master.value.trim() }), 30000);
      this.needed.set(false);
    } catch (e) {
      this.error.set((e as { status?: number }).status === 401 ? this.i18n.t('cfg.lock.denied') : (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown'));
    } finally {
      key.value = '';
      master.value = '';
      this.busy.set(false);
    }
  }

  // #endregion
}
