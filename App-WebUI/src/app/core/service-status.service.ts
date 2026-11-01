import { SettingsService } from './settings.service';
import { fetchJson, fetchTimeout } from './fetch-timeout';
import { ServiceConfig } from './models/app-settings.model';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ServiceResult, ServiceState } from './models/service-status.model';

const TIMEOUT = 8000;

/** Statuspage "indicator" values mapped to the states shown on the page. */
const INDICATORS: Record<string, ServiceState> = { none: 'operational', minor: 'degraded', maintenance: 'degraded', major: 'outage', critical: 'outage' };

@Injectable({ providedIn: 'root' })
export class ServiceStatusService {
  private readonly cfg = inject(SettingsService);
  readonly services = computed(() => this.cfg.settings().services.items.filter((s) => s.enabled));
  readonly checkedAt = signal<number | null>(null);
  readonly results = signal<Record<string, ServiceResult>>({});

  // #region Public Methods

  /** Check now and then on a timer while the page is open. Browser only. Returns a function that stops the timer. */
  watch(): () => void {
    void this.refresh();
    const secs = this.cfg.settings().services.refreshSeconds;
    const timer = secs > 0 ? setInterval(() => !document.hidden && void this.refresh(), secs * 1000) : undefined;
    return () => clearInterval(timer);
  }

  async refresh(): Promise<void> {
    const checking: Record<string, ServiceResult> = {};
    for (const s of this.services()) checking[s.id] = this.results()[s.id] ?? { state: 'checking', source: s.statusPage ? 'official' : 'probe' };
    this.results.set(checking);
    await Promise.all(
      this.services().map(async (s) => {
        const result = await this.check(s);
        this.results.update((r) => ({ ...r, [s.id]: result }));
      }),
    );
    this.checkedAt.set(Date.now());
  }

  // #endregion

  // #region Private Methods

  private async probe(s: ServiceConfig): Promise<ServiceResult> {
    try {
      // no-cors: the answer is opaque, so this only proves the site can be reached from this browser.
      await fetchTimeout(s.probeUrl ?? s.url, TIMEOUT, { mode: 'no-cors' });
      return { state: 'operational', source: 'probe' };
    } catch {
      return { state: 'unreachable', source: 'probe' };
    }
  }

  private async check(s: ServiceConfig): Promise<ServiceResult> {
    if (!s.statusPage) return this.probe(s);
    try {
      const body = await fetchJson<{ status?: { indicator?: string; description?: string } }>(`${s.statusPage}/api/v2/status.json`, TIMEOUT);
      // Statuspage sends "major" with the text "Partial System Outage" when only some locations are hit, so that is degraded, not an outage.
      const partial = body.status?.indicator === 'major' && /partial/i.test(body.status.description ?? '');
      const state = partial ? 'degraded' : INDICATORS[body.status?.indicator ?? ''];
      if (state) return { state, source: 'official' };
    } catch {
      /* the status page could not be read: fall back to a reachability check */
    }
    return this.probe(s);
  }

  // #endregion
}
