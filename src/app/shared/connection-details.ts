import { TranslationKey } from '../i18n/en';
import { I18nService } from '../core/i18n.service';
import { SettingsService } from '../core/settings.service';
import { ConnectionService } from '../core/connection.service';
import { ConnectionField } from '../core/models/app-settings.model';
import { Component, OnDestroy, afterNextRender, computed, inject } from '@angular/core';

const NET_KEYS: Record<string, TranslationKey> = { wifi: 'conn.net.wifi', cellular: 'conn.net.cellular', ethernet: 'conn.net.ethernet', bluetooth: 'conn.net.bluetooth' };

/** "Your connection details". Rows shown are chosen in appSettings.ts (connection.fields). */
@Component({
  selector: 'app-connection-details',
  templateUrl: './connection-details.html',
  styleUrl: './connection-details.scss',
})
export class ConnectionDetails implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly conn = inject(ConnectionService);
  private readonly cfg = inject(SettingsService);
  private stopWatching: () => void = () => {};

  protected readonly rows = computed(() =>
    (Object.keys(this.cfg.settings().connection.fields) as ConnectionField[])
      .filter((id) => this.cfg.settings().connection.fields[id])
      .map((id) => {
        const value = this.value(id);
        return { id, label: `conn.${id}` as TranslationKey, text: value ?? this.missing(id), found: value !== null };
      }),
  );

  constructor() {
    // Browser only: the prerendered page shows "Detecting…" and the real values arrive after the page loads.
    afterNextRender(() => (this.stopWatching = this.conn.watch()));
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.stopWatching();
  }

  // #endregion

  // #region Private Methods

  protected reload(): void {
    void this.conn.load();
  }

  private network(): string | null {
    const { type, effective } = this.conn.network();
    if (!type && !effective) return null;
    const name = type ? this.i18n.t(NET_KEYS[type] ?? 'conn.net.other') : null;
    return [name, effective?.toUpperCase()].filter(Boolean).join(' · ');
  }

  private missing(id: ConnectionField): string {
    if (id === 'mac') return this.i18n.t('conn.mac_na');
    if (id === 'networkType') return this.i18n.t('conn.net.unknown');
    if (this.conn.loading()) return this.i18n.t('conn.detecting');
    return this.i18n.t(id === 'ipv6' ? 'conn.noipv6' : 'conn.unavailable');
  }

  private value(id: ConnectionField): string | null {
    if (id === 'mac') return null;
    if (id === 'networkType') return this.network();
    return this.conn.info()[id];
  }

  // #endregion
}
