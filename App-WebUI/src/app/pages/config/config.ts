import { ApiService } from '../../core/api.service';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { TranslationKey } from '../../core/models/i18n.model';
import { FEATURES, FEATURE_GROUPS } from '../../core/features';
import { KeyStatus } from '../../core/models/key-status.model';
import { SettingsService, validStops } from '../../core/settings.service';
import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { ConfigGroup, PasswordKind, PasswordNotice, PasswordPlayer, SaveNotice, SaveTarget } from './config.model';
import { ConnectionField, FeatureId, SettingsOverrides, SettingsSection } from '../../core/models/app-settings.model';

/**
 * Shows every setting from the settings master tables (served by the API) and lets you change it. Edits are drafts that preview at once in this
 * browser; a Save button in every section (and Save all at the top) writes them to the database with the master key.
 */
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
  protected readonly gaugeBad = signal(false);
  protected readonly unlocked = signal(false);
  protected readonly keyIsSet = signal<boolean | null>(null);
  protected readonly lockNotice = signal<PasswordNotice | null>(null);

  /** The master key typed for saving. Lives in this signal only: never stored, never logged. */
  protected readonly masterKey = signal('');
  protected readonly saving = signal<SaveTarget | null>(null);
  protected readonly saveNotice = signal<SaveNotice | null>(null);

  protected readonly importMessage = signal<'' | 'ok' | 'bad'>('');
  protected readonly settings = this.cfg.settings;
  protected readonly defaults = this.cfg.defaults;
  protected readonly groups: ConfigGroup[] = FEATURE_GROUPS.map((g) => ({ ...g, items: FEATURES.filter((f) => f.group === g.id) }));

  protected readonly json = computed(() => JSON.stringify(this.cfg.overrides(), null, 2));

  protected readonly count = computed(() => this.cfg.pending());

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

    afterNextRender(() => void this.loadKeyState());
  }

  // #region Private Methods

  protected reset(): void {
    this.cfg.reset();
  }

  protected key(ev: Event): void {
    this.masterKey.set((ev.target as HTMLInputElement).value);
  }

  protected secs(ev: Event): void {
    this.cfg.setRefreshSeconds(+(ev.target as HTMLInputElement).value);
  }

  protected pick(ev: Event): void {
    this.player.set((ev.target as HTMLSelectElement).value as PasswordPlayer);
    this.notice.set(null);
  }

  /** Applies the typed gauge speeds (Mbps, separated by commas or spaces); a list the API would refuse is not applied. */
  protected gauge(ev: Event): void {
    const stops = (ev.target as HTMLInputElement).value.split(/[\s,]+/).filter(Boolean).map(Number);
    this.gaugeBad.set(!validStops(stops));
    if (!this.gaugeBad())
      this.cfg.setGaugeStops(stops);
  }

  protected state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  protected checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('yt.serverdown');
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

  private async loadKeyState(): Promise<void> {
    try {
      this.keyIsSet.set((await this.api.get<KeyStatus>('/settings/master-key')).isSet);
    } catch (e) {
      this.lockNotice.set({ text: this.failureText(e), error: true });
    }
  }

  protected saveLabel(target: SaveTarget): string {
    return this.i18n.t(this.saving() === target ? 'cfg.save.saving' : target === 'all' ? 'cfg.save.all' : 'cfg.save');
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

  /** Unsaved edits in one section; 0 disables that section's Save button. */
  protected pendingIn(section: SettingsSection): number {
    return this.cfg.pending([section]);
  }

  /** Saves one section, or every unsaved edit for `all`. The server checks the master key; the page only shows what the server answers. */
  protected async save(target: SaveTarget): Promise<void> {
    const key = this.masterKey().trim();
    if (!key) {
      this.saveNotice.set({ text: this.i18n.t('cfg.save.nokey'), error: true, section: target });
      return;
    }
    this.saving.set(target);
    this.saveNotice.set(null);
    try {
      const text = await this.cfg.save(key, target === 'all' ? undefined : [target]);
      this.saveNotice.set({ text: text || this.i18n.t('cfg.save.nothing'), error: false, section: target });
    } catch (e) {
      this.saveNotice.set({ text: this.failureText(e), error: true, section: target });
    } finally {
      this.saving.set(null);
    }
  }

  /** The answer of the last save, only when it belongs to this Save button. */
  protected noticeFor(target: SaveTarget): SaveNotice | null {
    const n = this.saveNotice();
    return n?.section === target ? n : null;
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
      const init = this.api.json({ newPassword: next }, { [reset ? 'X-Master-Key' : 'X-Edit-Password']: secret });
      const text = await this.api.message(reset ? 'POST' : 'PUT', `/music/${this.player()}/password${reset ? '/reset' : ''}`, init);
      this.notice.set({ text, error: false });
      form.reset();
    } catch (e) {
      this.notice.set({ text: this.failureText(e), error: true });
    } finally {
      this.busy.set(false);
    }
  }

  /** Asks the API whether the typed master key is right. Only then does the page open; the key stays in memory and is reused by the Save buttons. */
  protected async unlock(ev: Event, input: HTMLInputElement): Promise<void> {
    ev.preventDefault();
    const key = input.value.trim();
    if (!key || this.busy())
      return;
    this.busy.set(true);
    this.lockNotice.set(null);
    try {
      await this.api.message('POST', '/settings/unlock', { headers: { 'X-Master-Key': key } });
      this.masterKey.set(key);
      this.unlocked.set(true);
    } catch (e) {
      const denied = (e as { status?: number }).status === 401;
      this.lockNotice.set({ text: denied ? this.i18n.t('cfg.lock.denied') : this.failureText(e), error: true });
      input.value = '';
    } finally {
      this.busy.set(false);
    }
  }

  /** First visit: saves the chosen master key in the database (the API refuses once one exists), then opens the page. */
  protected async create(ev: Event, pw: HTMLInputElement, confirm: HTMLInputElement): Promise<void> {
    ev.preventDefault();
    if (this.busy())
      return;
    if (pw.value !== confirm.value)
      return this.lockNotice.set({ text: this.i18n.t('cfg.pw.mismatch'), error: true });
    if (!/^[\x21-\x7e]{6,64}$/.test(pw.value))
      return this.lockNotice.set({ text: this.i18n.t('cfg.pw.rule'), error: true });
    this.busy.set(true);
    this.lockNotice.set(null);
    try {
      await this.api.message('POST', '/settings/master-key', this.api.json({ password: pw.value, confirm: confirm.value }));
      this.masterKey.set(pw.value);
      this.unlocked.set(true);
    } catch (e) {
      this.lockNotice.set({ text: this.failureText(e), error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
