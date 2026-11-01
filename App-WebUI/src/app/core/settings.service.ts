import { APP_SETTINGS } from '../appSettings';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AppSettings, ConnectionField, FeatureId, SettingsOverrides } from './models/app-settings.model';

const STORAGE_KEY = 'thakurg-settings';

/**
 * The settings in use. appSettings.ts holds the defaults; the /config page saves changes in this browser and they are
 * layered on top. Prerendered HTML always uses the defaults; saved changes are applied once the page runs in the browser.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private restored = false;

  readonly defaults: AppSettings = APP_SETTINGS;
  readonly overrides = signal<SettingsOverrides>({});
  readonly changed = computed(() => Object.keys(this.overrides()).length > 0);

  readonly settings = computed<AppSettings>(() => {
    const o = this.overrides();
    const d = this.defaults;
    return {
      ...d,
      features: { ...d.features, ...o.features },
      youtube: { ...d.youtube, ...o.youtube },
      connection: { enabled: o.connection?.enabled ?? d.connection.enabled, fields: { ...d.connection.fields, ...o.connection?.fields } },
      services: {
        enabled: o.services?.enabled ?? d.services.enabled,
        refreshSeconds: o.services?.refreshSeconds ?? d.services.refreshSeconds,
        items: d.services.items.map((s) => ({ ...s, enabled: o.services?.items?.[s.id] ?? s.enabled })),
      },
    };
  });

  // #region Public Methods

  reset(): void {
    this.apply({});
  }

  /** Read the saved changes. Safe to call many times; browser only. */
  restore(): void {
    if (!this.browser || this.restored) return;
    this.restored = true;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (raw && typeof raw === 'object') this.overrides.set(this.clean(raw as SettingsOverrides));
    } catch {
      /* storage blocked or unreadable: use the defaults */
    }
  }

  /** Whether a feature is on. Reads a signal, so templates and effects update when it changes. */
  on(id: FeatureId): boolean {
    return this.settings().features[id];
  }

  /** Replace all saved changes, for example with settings pasted into the /config page. */
  import(next: SettingsOverrides): void {
    this.apply(this.clean(next));
  }

  setRefreshSeconds(value: number): void {
    this.change((o) => this.put((o.services ??= {}), 'refreshSeconds', Math.max(0, Math.round(value) || 0), this.defaults.services.refreshSeconds));
  }

  setServicesEnabled(value: boolean): void {
    this.change((o) => this.put((o.services ??= {}), 'enabled', value, this.defaults.services.enabled));
  }

  setFeature(id: FeatureId, value: boolean): void {
    this.change((o) => this.put((o.features ??= {}), id, value, this.defaults.features[id]));
  }

  setConnectionEnabled(value: boolean): void {
    this.change((o) => this.put((o.connection ??= {}), 'enabled', value, this.defaults.connection.enabled));
  }

  setServiceEnabled(id: string, value: boolean): void {
    const base = this.defaults.services.items.find((s) => s.id === id)?.enabled ?? true;
    this.change((o) => this.put(((o.services ??= {}).items ??= {}), id, value, base));
  }

  setConnectionField(id: ConnectionField, value: boolean): void {
    this.change((o) => this.put(((o.connection ??= {}).fields ??= {}), id, value, this.defaults.connection.fields[id]));
  }

  setYoutube<K extends keyof AppSettings['youtube']>(key: K, value: AppSettings['youtube'][K]): void {
    this.change((o) => this.put((o.youtube ??= {}), key, value, this.defaults.youtube[key]));
  }

  // #endregion

  // #region Private Methods

  private apply(next: SettingsOverrides): void {
    this.restored = true;
    this.overrides.set(next);
    if (!this.browser) return;
    try {
      if (this.changed()) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked: the change lasts until the page is closed */
    }
  }

  private change(fn: (o: SettingsOverrides) => void): void {
    const next = structuredClone(this.overrides());
    fn(next);
    this.apply(this.clean(next));
  }

  /** Keep only values that exist in appSettings.ts, have the right type and differ from the default. */
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
      if (typeof v === 'boolean' && v !== s.enabled) items[s.id] = v;
    }
    if (features) out.features = features;
    if (youtube) out.youtube = youtube;

    const connection: NonNullable<SettingsOverrides['connection']> = {};
    if (typeof o.connection?.enabled === 'boolean' && o.connection.enabled !== d.connection.enabled) connection.enabled = o.connection.enabled;
    if (fields) connection.fields = fields;
    if (Object.keys(connection).length) out.connection = connection;

    const services: NonNullable<SettingsOverrides['services']> = {};
    if (typeof o.services?.enabled === 'boolean' && o.services.enabled !== d.services.enabled) services.enabled = o.services.enabled;
    const secs = o.services?.refreshSeconds;
    if (typeof secs === 'number' && Math.max(0, Math.round(secs)) !== d.services.refreshSeconds) services.refreshSeconds = Math.max(0, Math.round(secs));
    if (Object.keys(items).length) services.items = items;
    if (Object.keys(services).length) out.services = services;
    return out;
  }

  /** Set a value, or remove it when it equals the default so only real differences are saved. */
  private put<T extends object, K extends keyof T>(target: T, key: K, value: T[K], base: T[K]): void {
    if (value === base) delete target[key];
    else target[key] = value;
  }

  // #endregion
}
