import { FEATURES } from './features';
import { ApiService } from './api.service';
import { EMPTY_SETTINGS } from '../appSettings';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AppSettings, ConnectionField, FeatureFlags, FeatureId, SettingsOverrides, SettingsSection } from './models/app-settings.model';

const LOAD_TIMEOUT = 5000;
const SAVE_TIMEOUT = 15000;

/**
 * The settings in use. The master tables (served by GET /settings) hold the saved values. Edits made on the /master page are drafts: they are
 * layered on top so the site previews them at once, live in memory only (a reload discards them) and are written back with `save`.
 */
@Injectable({ providedIn: 'root' })

export class SettingsService {
  private readonly api = inject(ApiService);
  readonly overrides = signal<SettingsOverrides>({});
  private readonly base = signal<AppSettings>(EMPTY_SETTINGS);
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

  /** Discard every unsaved edit. */
  reset(): void {
    this.overrides.set({});
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

  /** Replace all unsaved edits, for example with settings pasted into the /master page. */
  import(next: SettingsOverrides): void {
    this.overrides.set(this.clean(next));
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
      Object.keys(o.connection?.fields ?? {}).length +
      Object.keys(o.services?.items ?? {}).length +
      (o.connection?.enabled === undefined ? 0 : 1) +
      (o.services?.enabled === undefined ? 0 : 1) +
      (o.services?.refreshSeconds === undefined ? 0 : 1)
    );
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

  /**
   * Writes the unsaved edits (all of them, or only those of the given sections) to the master tables with the master key, then makes the
   * answer the new saved values and drops the edits that were saved. Resolves with the server's message; rejects with the server's message.
   */
  async save(masterKey: string, sections?: SettingsSection[]): Promise<string> {
    const body = this.slice(this.overrides(), sections);
    if (!Object.keys(body).length)
      return '';
    const res = await this.api.sendFull<Partial<AppSettings>>('PUT', '/settings', this.api.json(body, { 'X-Master-Key': masterKey }), SAVE_TIMEOUT);
    this.base.set(this.merge(res.data));
    this.overrides.set(this.clean(this.overrides()));
    return res.message ?? '';
  }

  // #endregion

  // #region Private Methods

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

  /** Keep only values that exist in the loaded settings, have the right type and differ from the saved value. */
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
    this.overrides.set(this.clean(next));
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
    return out;
  }

  /** Set a value, or remove it when it equals the saved value so only real differences are kept. */
  private put<T extends object, K extends keyof T>(target: T, key: K, value: T[K], base: T[K]): void {
    if (value === base) {
      delete target[key];
    } else {
      target[key] = value;
    }
  }

  // #endregion
}
