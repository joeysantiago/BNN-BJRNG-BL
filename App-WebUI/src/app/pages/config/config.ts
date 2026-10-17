import { ConfigGroup, PasswordKind, PasswordNotice, PasswordPlayer } from './config.model';
import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { TranslationKey } from '../../core/models/i18n.model';
import { SettingsService } from '../../core/settings.service';
import { FEATURES, FEATURE_GROUPS } from '../../core/features';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ConnectionField, FeatureId, SettingsOverrides } from '../../core/models/app-settings.model';

/** Shows every setting from the settings master table (served by the API) and lets you change it. Changes are saved in this browser. */
@Component({
  selector: 'app-config',
  templateUrl: './config.html',
  styleUrl: './config.scss',
})
export class Config {
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  private readonly seo = inject(SeoService);
  private readonly api = inject(ApiService);

  protected readonly players: PasswordPlayer[] = ['creta', 'nexon'];
  protected readonly player = signal<PasswordPlayer>('creta');
  protected readonly notice = signal<PasswordNotice | null>(null);
  protected readonly busy = signal(false);

  protected readonly importMessage = signal<'' | 'ok' | 'bad'>('');
  protected readonly settings = this.cfg.settings;
  protected readonly defaults = this.cfg.defaults;
  protected readonly groups: ConfigGroup[] = FEATURE_GROUPS.map((g) => ({ ...g, items: FEATURES.filter((f) => f.group === g.id) }));

  protected readonly json = computed(() => JSON.stringify(this.cfg.overrides(), null, 2));

  protected readonly count = computed(() => {
    const o = this.cfg.overrides();
    return (
      Object.keys(o.features ?? {}).length +
      Object.keys(o.connection?.fields ?? {}).length +
      Object.keys(o.services?.items ?? {}).length +
      (o.connection?.enabled === undefined ? 0 : 1) +
      (o.services?.enabled === undefined ? 0 : 1) +
      (o.services?.refreshSeconds === undefined ? 0 : 1)
    );
  });

  protected readonly fields = computed(() => Object.keys(this.defaults.connection.fields) as ConnectionField[]);

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.cfg.title'),
        description: this.i18n.t('seo.cfg.desc'),
        path: '/master/',
        image: 'default',
        lang: this.i18n.lang(),
        // A tool for the site owner, not a page to find in search results.
        noindex: true,
      });
    });
  }

  // #region Private Methods

  protected reset(): void {
    this.cfg.reset();
  }

  protected secs(ev: Event): void {
    this.cfg.setRefreshSeconds(+(ev.target as HTMLInputElement).value);
  }

  protected pick(ev: Event): void {
    this.player.set((ev.target as HTMLSelectElement).value as PasswordPlayer);
    this.notice.set(null);
  }

  protected state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  protected checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  protected importJson(text: string): void {
    try {
      const parsed = JSON.parse(text) as SettingsOverrides;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('not an object');
      this.cfg.import(parsed);
      this.importMessage.set('ok');
    } catch {
      this.importMessage.set('bad');
    }
  }

  protected change(ev: Event): Promise<void> {
    return this.submit(ev, 'change');
  }

  protected resetPassword(ev: Event): Promise<void> {
    return this.submit(ev, 'reset');
  }

  protected feature(id: FeatureId, ev: Event): void {
    this.cfg.setFeature(id, this.checked(ev));
  }

  protected label(id: ConnectionField): TranslationKey {
    return `conn.${id}` as TranslationKey;
  }

  /** Sends the new password. Change proves the current password (X-Edit-Password); reset proves the master key (X-Master-Key). Nothing is stored in the browser. */
  private async submit(ev: Event, kind: PasswordKind): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const secret = String(data.get('secret') ?? '');
    const next = String(data.get('next') ?? '');
    if (next !== String(data.get('confirm') ?? '')) {
      this.notice.set({ text: this.i18n.t('cfg.pw.mismatch'), error: true });
      return;
    }
    if (/[^\x20-\x7e]/.test(secret + next)) {
      this.notice.set({ text: this.i18n.t('cfg.pw.rule'), error: true });
      return;
    }
    this.busy.set(true);
    try {
      const reset = kind === 'reset';
      const headers = { 'Content-Type': 'application/json', [reset ? 'X-Master-Key' : 'X-Edit-Password']: secret };
      const text = await this.api.message(reset ? 'POST' : 'PUT', `/music/${this.player()}/password${reset ? '/reset' : ''}`, { headers, body: JSON.stringify({ newPassword: next }) });
      this.notice.set({ text, error: false });
      form.reset();
    } catch (e) {
      const known = (e as { status?: number }).status !== undefined;
      this.notice.set({ text: known ? (e as Error).message : this.i18n.t('yt.serverdown'), error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
