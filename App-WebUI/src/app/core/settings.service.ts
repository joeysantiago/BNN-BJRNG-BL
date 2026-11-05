import { FEATURES } from './features';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { APP_SETTINGS } from '../appSettings';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AppSettings, ConnectionField, FeatureFlags, FeatureId, PageId, SettingsOverrides, SettingsSection } from './models/app-settings.model';

/** Same rule as the API branches: 2 to 20 whole numbers, the first 0, each larger than the one before, at most 100000. */
export const validStops = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && v.length <= 20 && v.every((n) => Number.isInteger(n)) && v[0] === 0 && v[v.length - 1] <= 100000 && v.every((n, i) => i === 0 || n > v[i - 1]);

const sameStops = (a: number[], b: number[]): boolean => a.length === b.length && a.every((n, i) => n === b[i]);

/**
 * The settings in use. appSettings.ts holds the defaults; the saved changes (Settings page, Save buttons) are layered on top, and are kept by the demo backend
 * in this browser (Mojito has no API). Edits made on the Settings page are drafts on top of that: the site previews them at once, they live in memory only
 * (a reload discards them) and `save` writes them. Prerendered HTML always uses the defaults; saved changes are applied once the page runs in the browser.
 */
@Injectable({ providedIn: 'root' })

export class SettingsService {
  private restored = false;
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  /** Options the logged-in user switched off for themselves (set by AuthService). They only hide: a site-wide switch that is off stays off. */
  private readonly hidden = signal<string[]>([]);
  readonly overrides = signal<SettingsOverrides>({});
  private readonly saved = signal<SettingsOverrides>({});
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly changed = computed(() => Object.keys(this.overrides()).length > 0);
  /** The saved values: appSettings.ts with the saved changes on top. Drafts are compared with these. */
  private readonly base = computed<AppSettings>(() => this.layer(APP_SETTINGS, this.saved()));
  readonly settings = computed<AppSettings>(() => this.layer(this.base(), this.overrides()));

  get defaults(): AppSettings {
    return this.base();
  }

  // #region Public Methods

  /** Discard every unsaved edit. */
  reset(): void {
    this.overrides.set({});
  }

  /** Read the saved changes. Safe to call many times; browser only. */
  restore(): void {
    if (!this.browser || this.restored)
      return;
    this.restored = true;
    void this.load();
  }

  /** Reads the saved changes again (after an app renamed itself, as the API branches reload the settings). Browser only. */
  async load(): Promise<void> {
    if (!this.browser)
      return;
    const saved = this.api.savedSettings();
    this.saved.set(saved);
    this.i18n.rename(saved.pageNames ?? {});
  }

  /** Whether a feature is on for this visitor: on for the site and not switched off by the logged-in user. Reads signals, so templates and effects update when it changes. */
  on(id: FeatureId): boolean {
    return this.settings().features[id] && !this.hidden().includes(id);
  }

  /** The options the logged-in user switched off for themselves; an empty list after a logout. */
  setHidden(codes: string[]): void {
    this.hidden.set(codes);
  }

  /** Replace all unsaved edits, for example with settings pasted into the Settings page. */
  import(next: SettingsOverrides): void {
    this.overrides.set(this.clean(next));
  }

  /** Set the speeds (Mbps) printed on the speed test gauge. Invalid lists are ignored. */
  setGaugeStops(stops: number[]): void {
    if (!validStops(stops))
      return;
    this.change((o) => {
      if (sameStops(stops, this.defaults.speed.gaugeStops))
        delete o.speed;
      else
        o.speed = { gaugeStops: stops };
    });
  }

  setRefreshSeconds(value: number): void {
    this.change((o) => this.put((o.services ??= {}), 'refreshSeconds', Math.max(0, Math.round(value) || 0), this.defaults.services.refreshSeconds));
  }

  setServicesEnabled(value: boolean): void {
    this.change((o) => this.put((o.services ??= {}), 'enabled', value, this.defaults.services.enabled));
  }

  setConnectionEnabled(value: boolean): void {
    this.change((o) => this.put((o.connection ??= {}), 'enabled', value, this.defaults.connection.enabled));
  }

  /** How many edits are unsaved, optionally only in the given sections. Reads a signal, so templates update when it changes. */
  pending(sections?: SettingsSection[]): number {
    const o = this.slice(this.overrides(), sections);
    return (
      Object.keys(o.features ?? {}).length +
      Object.keys(o.youtube ?? {}).length +
      Object.keys(o.connection?.fields ?? {}).length +
      Object.keys(o.services?.items ?? {}).length +
      (o.connection?.enabled === undefined ? 0 : 1) +
      (o.services?.enabled === undefined ? 0 : 1) +
      (o.services?.refreshSeconds === undefined ? 0 : 1) +
      (o.speed?.gaugeStops === undefined ? 0 : 1)
    );
  }

  setFeature(id: FeatureId, value: boolean): void {
    this.change((o) => this.put((o.features ??= {}), id, value, this.defaults.features[id]));
  }

  setServiceEnabled(id: string, value: boolean): void {
    const base = this.defaults.services.items.find((s) => s.id === id)?.enabled ?? true;
    this.change((o) => this.put(((o.services ??= {}).items ??= {}), id, value, base));
  }

  /**
   * Writes the unsaved edits (all of them, or only those of the given sections) through the demo backend, which checks the user's rights like the API does,
   * then makes its answer the new saved values and drops the edits that were saved. Resolves with the server's message; rejects with the server's message.
   */
  async save(sections?: SettingsSection[]): Promise<string> {
    const body = this.slice(this.overrides(), sections);
    if (!Object.keys(body).length)
      return '';
    const res = await this.api.sendFull<SettingsOverrides>('PUT', '/settings', this.api.json(body));
    this.saved.set(res.data);
    this.i18n.rename(res.data.pageNames ?? {});
    this.overrides.set(this.clean(this.overrides()));
    return res.message ?? '';
  }

  setConnectionField(id: ConnectionField, value: boolean): void {
    this.change((o) => this.put(((o.connection ??= {}).fields ??= {}), id, value, this.defaults.connection.fields[id]));
  }

  setYoutube<K extends keyof AppSettings['youtube']>(key: K, value: AppSettings['youtube'][K]): void {
    this.change((o) => this.put((o.youtube ??= {}), key, value, this.defaults.youtube[key]));
  }

  // #endregion

  // #region Private Methods

  private change(fn: (o: SettingsOverrides) => void): void {
    const next = structuredClone(this.overrides());
    fn(next);
    this.overrides.set(this.clean(next));
  }

  /** Settings with changes on top. */
  private layer(d: AppSettings, o: SettingsOverrides): AppSettings {
    return {
      ...d,
      features: { ...d.features, ...o.features },
      youtube: { ...d.youtube, ...o.youtube },
      speed: { gaugeStops: o.speed?.gaugeStops ?? d.speed.gaugeStops },
      pageNames: Object.fromEntries(Object.entries(d.pageNames).map(([id, n]) => [id, { ...n, ...o.pageNames?.[id as PageId] }])) as AppSettings['pageNames'],
      connection: { enabled: o.connection?.enabled ?? d.connection.enabled, fields: { ...d.connection.fields, ...o.connection?.fields } },
      services: {
        enabled: o.services?.enabled ?? d.services.enabled,
        refreshSeconds: o.services?.refreshSeconds ?? d.services.refreshSeconds,
        items: d.services.items.map((s) => ({ ...s, enabled: o.services?.items?.[s.id] ?? s.enabled })),
      },
    };
  }

  /** Keep only values that exist in the saved settings, have the right type and differ from the saved value. */
  private clean(o: SettingsOverrides): SettingsOverrides {
    const d = this.defaults;
    const diff = <T extends object>(src: Partial<T> | undefined, base: T): Partial<T> | undefined => {
      const r: Partial<T> = {};
      for (const k of Object.keys(src ?? {}) as (keyof T)[]) if (k in base && typeof src![k] === typeof base[k] && src![k] !== base[k]) r[k] = src![k];
      return Object.keys(r).length ? r : undefined;
    };
    const out: SettingsOverrides = {};
    const features = diff(o.features, d.features);
    const youtube = diff(o.youtube, d.youtube);
    const fields = diff(o.connection?.fields, d.connection.fields);
    const items: Record<string, boolean> = {};
    for (const s of d.services.items) {
      const v = o.services?.items?.[s.id];
      if (typeof v === 'boolean' && v !== s.enabled)
        items[s.id] = v;
    }
    if (features)
      out.features = features;
    if (youtube)
      out.youtube = youtube;
    if (validStops(o.speed?.gaugeStops) && !sameStops(o.speed.gaugeStops, d.speed.gaugeStops))
      out.speed = { gaugeStops: o.speed.gaugeStops };

    const connection: NonNullable<SettingsOverrides['connection']> = {};
    if (typeof o.connection?.enabled === 'boolean' && o.connection.enabled !== d.connection.enabled)
      connection.enabled = o.connection.enabled;
    if (fields)
      connection.fields = fields;
    if (Object.keys(connection).length)
      out.connection = connection;

    const services: NonNullable<SettingsOverrides['services']> = {};
    if (typeof o.services?.enabled === 'boolean' && o.services.enabled !== d.services.enabled)
      services.enabled = o.services.enabled;
    const secs = o.services?.refreshSeconds;
    if (typeof secs === 'number' && Math.max(0, Math.round(secs)) !== d.services.refreshSeconds)
      services.refreshSeconds = Math.max(0, Math.round(secs));
    if (Object.keys(items).length)
      services.items = items;
    if (Object.keys(services).length)
      out.services = services;
    return out;
  }

  /** The part of the edits that belongs to the given sections (all of it when none are given). */
  private slice(o: SettingsOverrides, sections?: SettingsSection[]): SettingsOverrides {
    const wants = (s: SettingsSection) => !sections || sections.includes(s);
    const features = Object.entries(o.features ?? {}).filter(([id]) => {
      const group = FEATURES.find((f) => f.id === id)?.group;
      return group !== undefined && wants(group);
    });
    const out: SettingsOverrides = {};
    if (features.length)
      out.features = Object.fromEntries(features) as Partial<FeatureFlags>;
    if (o.connection && wants('connection'))
      out.connection = o.connection;
    if (o.services && wants('services'))
      out.services = o.services;
    if (o.youtube && wants('youtubeAccess'))
      out.youtube = o.youtube;
    if (o.speed && wants('speed'))
      out.speed = o.speed;
    return out;
  }

  /** Set a value, or remove it when it equals the saved value so only real differences are kept. */
  private put<T extends object, K extends keyof T>(target: T, key: K, value: T[K], base: T[K]): void {
    if (value === base)
      delete target[key];
    else
      target[key] = value;
  }

  // #endregion
}
