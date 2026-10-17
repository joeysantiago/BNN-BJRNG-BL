import { ApiService } from './api.service';
import { EMPTY_SETTINGS } from '../appSettings';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AppSettings, ConnectionField, FeatureId, SettingsOverrides } from './models/app-settings.model';

const STORAGE_KEY = 'thakurg-settings';
const LOAD_TIMEOUT = 5000;

/**
 * The settings in use. The master tables (served by GET /settings) hold the defaults; the /config page saves changes in this browser and they
 * are layered on top. Prerendered HTML uses the API values only; saved changes are applied once the page runs in the browser.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private restored = false;
  private readonly api = inject(ApiService);
  readonly overrides = signal<SettingsOverrides>({});
  private readonly base = signal<AppSettings>(EMPTY_SETTINGS);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly changed = computed(() => Object.keys(this.overrides()).length > 0);
  readonly settings = computed<AppSettings>(() => {
    const o = this.overrides();
    const d = this.base();
    return {
      ...d,
      features: { ...d.features, ...o.features },
      connection: { enabled: o.connection?.enabled ?? d.connection.enabled, fields: { ...d.connection.fields, ...o.connection?.fields } },
      services: {
        enabled: o.services?.enabled ?? d.services.enabled,
        refreshSeconds: o.services?.refreshSeconds ?? d.services.refreshSeconds,
        items: d.services.items.map((s) => ({ ...s, enabled: o.services?.items?.[s.id] ?? s.enabled })),
      },
    };
  });

  get defaults(): AppSettings {
    return this.base();
  }

  // #region Public Methods

  reset(): void {
    this.apply({});
  }

  /** Read the saved changes. Safe to call many times; browser only. */
  restore(): void {
    if (!this.browser || this.restored)
      return;
    this.restored = true;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (raw && typeof raw === 'object')
        this.overrides.set(this.clean(raw as SettingsOverrides));
    } catch {
      /* storage blocked or unreadable: use the defaults */
    }
  }

  /** Whether a feature is on. Reads a signal, so templates and effects update when it changes. */
  on(id: FeatureId): boolean {
    return this.settings().features[id];
  }

  /** Fetch the settings from the API. Never throws: when the API cannot be reached the structural fallback stays in use. */
  async load(): Promise<void> {
    try {
      this.base.set(this.merge(await this.api.get<Partial<AppSettings>>('/settings', LOAD_TIMEOUT)));
    } catch (e) {
      console.warn('Settings could not be loaded from the API; using the empty fallback.', e);
    }
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

  setConnectionEnabled(value: boolean): void {
    this.change((o) => this.put((o.connection ??= {}), 'enabled', value, this.defaults.connection.enabled));
  }

  setFeature(id: FeatureId, value: boolean): void {
    this.change((o) => this.put((o.features ??= {}), id, value, this.defaults.features[id]));
  }

  setServiceEnabled(id: string, value: boolean): void {
    const base = this.defaults.services.items.find((s) => s.id === id)?.enabled ?? true;
    this.change((o) => this.put(((o.services ??= {}).items ??= {}), id, value, base));
  }

  setConnectionField(id: ConnectionField, value: boolean): void {
    this.change((o) => this.put(((o.connection ??= {}).fields ??= {}), id, value, this.defaults.connection.fields[id]));
  }

  // #endregion

  // #region Private Methods

  private apply(next: SettingsOverrides): void {
    this.restored = true;
    this.overrides.set(next);
    if (!this.browser)
      return;
    try {
      if (this.changed()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage blocked: the change lasts until the page is closed */
    }
  }

  /** Fills anything the API left out from the fallback, so a partial answer cannot break a page. */
  private merge(data: Partial<AppSettings>): AppSettings {
    const f = EMPTY_SETTINGS;
    return {
      features: { ...f.features, ...data.features },
      pageNames: { ...f.pageNames, ...data.pageNames },
      connection: { enabled: data.connection?.enabled ?? f.connection.enabled, fields: { ...f.connection.fields, ...data.connection?.fields } },
      services: { ...f.services, ...data.services, items: data.services?.items ?? f.services.items },
    };
  }

  /** Keep only values that exist in the loaded settings, have the right type and differ from the default. */
  private clean(o: SettingsOverrides): SettingsOverrides {
    const d = this.defaults;
    const diff = <T extends object>(src: Partial<T> | undefined, base: T): Partial<T> | undefined => {
      const r: Partial<T> = {};
      for (const k of Object.keys(src ?? {}) as (keyof T)[]) if (k in base && typeof src![k] === typeof base[k] && src![k] !== base[k]) r[k] = src![k];
      return Object.keys(r).length ? r : undefined;
    };
    const out: SettingsOverrides = {};
    const features = diff(o.features, d.features);
    const fields = diff(o.connection?.fields, d.connection.fields);
    const items: Record<string, boolean> = {};
    for (const s of d.services.items) {
      const v = o.services?.items?.[s.id];
      if (typeof v === 'boolean' && v !== s.enabled)
        items[s.id] = v;
    }
    if (features)
      out.features = features;

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

  private change(fn: (o: SettingsOverrides) => void): void {
    const next = structuredClone(this.overrides());
    fn(next);
    this.apply(this.clean(next));
  }

  /** Set a value, or remove it when it equals the default so only real differences are saved. */
  private put<T extends object, K extends keyof T>(target: T, key: K, value: T[K], base: T[K]): void {
    if (value === base) {
      delete target[key];
    } else {
      target[key] = value;
    }
  }

  // #endregion
}
