import { PanelNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { KeyStatus } from '../../../core/models/key-status.model';
import { Component, afterNextRender, inject, signal } from '@angular/core';

/**
 * Settings > Keys > YouTube API key (super admin, password login; shown only where the YouTube player is built). The key is sent only when typed:
 * the API checks it with Google, stores it in the database and only says whether one is saved.
 */
@Component({
  selector: 'app-youtube-key-card',
  templateUrl: './youtube-key-card.html',
  styleUrl: './youtube-key-card.scss',
})

export class YoutubeKeyCard {
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly keySet = signal<boolean | null>(null);
  protected readonly notice = signal<PanelNotice | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  /** Sends the YouTube API key. The API checks that the caller is an administrator and checks the key with Google, then stores it in the database. */
  async save(ev: Event, input: HTMLInputElement): Promise<void> {
    ev.preventDefault();
    const key = input.value.trim();
    if (!key || this.busy())
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = await this.api.message('POST', '/youtube/key', this.api.json({ apiKey: key }), 30000);
      this.keySet.set(true);
      this.notice.set({ text, error: false });
      input.value = '';
    } catch (e) {
      this.notice.set({ text: this.failureText(e), error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.keySet.set((await this.api.get<KeyStatus>('/youtube/key')).isSet);
    } catch (e) {
      this.notice.set({ text: this.failureText(e), error: true });
    }
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown');
  }

  // #endregion
}
