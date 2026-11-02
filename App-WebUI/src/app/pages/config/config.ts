import { ConfigGroup } from './config.model';
import { TranslationKey } from '../../i18n/en';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { SettingsService } from '../../core/settings.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FEATURES, FEATURE_APPS, FEATURE_GROUPS, featureBuilt } from '../../core/features';
import { AppSettings, ConnectionField, FeatureId, SettingsOverrides } from '../../core/models/app-settings.model';

/** Shows the settings of this build's apps (FEATURE_APPS) and the site-wide ones from appSettings.ts and lets you change them. Changes are saved in this browser. */
@Component({
  selector: 'app-config',
  templateUrl: './config.html',
  styleUrl: './config.scss',
})
export class Config {
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  private readonly seo = inject(SeoService);

  protected readonly importMessage = signal<'' | 'ok' | 'bad'>('');
  protected readonly settings = this.cfg.settings;
  protected readonly defaults = this.cfg.defaults;
  protected readonly hasSpeed = featureBuilt('speed', FEATURE_APPS);
  protected readonly hasYoutube = featureBuilt('youtube', FEATURE_APPS);
  // Only this build's apps: a build without the speed test or YouTube shows none of their settings.
  protected readonly groups: ConfigGroup[] = FEATURE_GROUPS.filter((g) => featureBuilt(g.id, FEATURE_APPS)).map((g) => ({ ...g, items: FEATURES.filter((f) => f.group === g.id && featureBuilt(f.id, FEATURE_APPS)) })).filter((g) => g.items.length);

  protected readonly json = computed(() => JSON.stringify(this.cfg.overrides(), null, 2));

  protected readonly count = computed(() => {
    const o = this.cfg.overrides();
    return (
      Object.keys(o.features ?? {}).length +
      Object.keys(o.youtube ?? {}).length +
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

  protected checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  protected state(on: boolean): string {
    return this.i18n.t(on ? 'cfg.on' : 'cfg.off');
  }

  protected secs(ev: Event): void {
    this.cfg.setRefreshSeconds(+(ev.target as HTMLInputElement).value);
  }

  protected label(id: ConnectionField): TranslationKey {
    return `conn.${id}` as TranslationKey;
  }

  protected feature(id: FeatureId, ev: Event): void {
    this.cfg.setFeature(id, this.checked(ev));
  }

  protected importJson(text: string): void {
    try {
      const parsed = JSON.parse(text) as SettingsOverrides;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      this.cfg.import(parsed);
      this.importMessage.set('ok');
    } catch {
      this.importMessage.set('bad');
    }
  }

  protected youtube(key: keyof AppSettings['youtube'], ev: Event): void {
    this.cfg.setYoutube(key, (ev.target as HTMLInputElement).value.trim());
  }

  // #endregion
}
