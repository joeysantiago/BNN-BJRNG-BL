import { UploadStatus } from './creta-add.model';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlayerId, Track, TracksResponse } from '../creta/creta.model';
import { Component, afterNextRender, effect, inject, signal } from '@angular/core';

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;
const PASSWORD_HEADER = 'X-Edit-Password';

/** Upload page of the Creta and Nexon players (/creta-add and /nexon-add). The server saves the files in its audio folder and adds the songs to the database. */
@Component({
  selector: 'app-creta-add',
  imports: [RouterLink],
  templateUrl: './creta-add.html',
  styleUrl: './creta-add.scss',
})
export class CretaAdd {
  protected readonly id: PlayerId = inject(ActivatedRoute).snapshot.data['player'] === 'nexon' ? 'nexon' : 'creta';
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  protected readonly loaded = signal(false);
  protected readonly i18n = inject(I18nService);
  protected readonly tracks = signal<Track[]>([]);
  protected readonly status = signal<UploadStatus | null>(null);

  constructor() {
    effect(() => {
      const name = this.i18n.page(this.id);
      this.seo.set({
        title: `${this.i18n.t('creta.add.h1')} - ${name}`,
        description: this.i18n.t('creta.add.lead', { name }),
        path: `/${this.id}-add/`,
        image: 'default',
        lang: this.i18n.lang(),
        imageAlt: name,
        // A tool for the site owner, not a page to find in search results.
        noindex: true,
      });
    });

    afterNextRender(() => void this.loadTracks());
  }

  // #region Private Methods

  private fail(text: string): void {
    this.status.set({ text, error: true });
  }

  private errorText(e: unknown): string {
    const status = (e as { status?: number }).status;
    if (!status || status === 413)
      return this.i18n.t('creta.edit.failed');
    return (e as Error).message;
  }

  private async loadTracks(): Promise<void> {
    try {
      this.tracks.set((await this.api.get<TracksResponse>(`/music/${this.id}/tracks`)).tracks);
    } catch {
      this.tracks.set([]);
    }
    this.loaded.set(true);
  }

  protected async upload(password: HTMLInputElement, picker: HTMLInputElement): Promise<void> {
    const list = Array.from(picker.files ?? []);
    if (this.busy())
      return;
    if (!list.length)
      return this.fail(this.i18n.t('creta.edit.noFiles'));
    const bad = list.find((f) => !AUDIO_EXT.test(f.name));
    if (bad)
      return this.fail(this.i18n.t('creta.edit.badType', { name: bad.name }));
    this.busy.set(true);
    this.status.set({ text: this.i18n.t('creta.edit.uploading', { name: list.map((f) => f.name).join(', ') }), error: false });
    try {
      const body = new FormData();
      for (const f of list) body.append('files', f, f.name);
      const res = await this.api.sendFull<TracksResponse>('POST', `/music/${this.id}/tracks`, { body, headers: { [PASSWORD_HEADER]: password.value } });
      this.tracks.set(res.data.tracks);
      this.status.set({ text: res.message || this.i18n.t('creta.edit.uploaded'), error: false });
      password.value = '';
      picker.value = '';
    } catch (e) {
      this.fail(this.errorText(e));
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
