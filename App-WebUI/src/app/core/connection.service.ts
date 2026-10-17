import { ApiService } from './api.service';
import { fetchJson } from './fetch-timeout';
import { SpeedInfo } from './models/api.model';
import { Injectable, inject, signal } from '@angular/core';
import { ConnectionInfo, IpLookup, NetworkInformation, NetworkType } from './models/connection.model';

const TIMEOUT = 8000;
const LOOKUP = 'https://ipwho.is/';
const IPV4 = 'https://api4.ipify.org?format=json';
const IPV6 = 'https://api6.ipify.org?format=json';
const EMPTY: ConnectionInfo = { isp: null, ip: null, ipv4: null, ipv6: null, location: null, testServer: null };

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  readonly loading = signal(true);
  private readonly api = inject(ApiService);
  readonly info = signal<ConnectionInfo>(EMPTY);
  readonly network = signal<NetworkType>({ type: null, effective: null });

  // #region Public Methods

  /** Look up the details and follow network changes. Browser only. Returns a function that stops following. */
  watch(): () => void {
    void this.load();
    const conn = this.connection();
    const onChange = () => this.readNetwork();
    this.readNetwork();
    conn?.addEventListener('change', onChange);
    return () => conn?.removeEventListener('change', onChange);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const [lookup, server, v4, v6] = await Promise.allSettled([fetchJson<IpLookup>(LOOKUP, TIMEOUT), this.api.get<SpeedInfo>('/speedtest/info', TIMEOUT), fetchJson<{ ip: string }>(IPV4, TIMEOUT), fetchJson<{ ip: string }>(IPV6, TIMEOUT)]);
    const m = lookup.status === 'fulfilled' && lookup.value.success !== false ? lookup.value : null;
    this.info.set({
      isp: m?.connection?.isp ?? m?.connection?.org ?? null,
      ip: m?.ip ?? (server.status === 'fulfilled' ? server.value.ip : null),
      ipv4: v4.status === 'fulfilled' ? v4.value.ip : null,
      ipv6: v6.status === 'fulfilled' ? v6.value.ip : null,
      location: m ? [m.city, m.region, m.country].filter(Boolean).join(', ') || null : null,
      testServer: server.status === 'fulfilled' ? server.value.serverName : null,
    });
    this.loading.set(false);
  }

  // #endregion

  // #region Private Methods

  private readNetwork(): void {
    const c = this.connection();
    const type = c?.type && c.type !== 'unknown' ? c.type : null;
    this.network.set({ type, effective: c?.effectiveType ?? null });
  }

  private connection(): NetworkInformation | undefined {
    return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: NetworkInformation }).connection;
  }

  // #endregion
}
