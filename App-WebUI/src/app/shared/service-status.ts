import { TranslationKey } from '../i18n/en';
import { I18nService } from '../core/i18n.service';
import { ServiceGroup } from '../core/models/app-settings.model';
import { ServiceStatusService } from '../core/service-status.service';
import { Component, OnDestroy, afterNextRender, computed, inject } from '@angular/core';

const GROUPS: ServiceGroup[] = ['apps', 'telecom'];

/** "Services status". The services shown are chosen in appSettings.ts (services.items). */
@Component({
  selector: 'app-service-status',
  templateUrl: './service-status.html',
  styleUrl: './service-status.scss',
})
export class ServiceStatus implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly status = inject(ServiceStatusService);
  private stopWatching: () => void = () => {};

  protected readonly groups = computed(() => GROUPS.map((g) => ({
    id: g,
    label: `svc.group.${g}` as TranslationKey,
    items: this.status.services().filter((s) => s.group === g),
  })).filter((g) => g.items.length));

  protected readonly issues = computed(() => Object.values(this.status.results()).filter((r) => r.state !== 'operational' && r.state !== 'checking').length);

  protected readonly summary = computed(() => {
    const at = this.status.checkedAt();
    if (!at) return this.i18n.t('svc.checking');
    const time = new Date(at).toLocaleTimeString(this.i18n.lang(), { hour: '2-digit', minute: '2-digit' });
    const head = this.issues() ? this.i18n.t('svc.issues', { n: this.issues() }) : this.i18n.t('svc.all_ok');
    return `${head} ${this.i18n.t('svc.checked', { time })}`;
  });

  constructor() {
    // Browser only: the prerendered page lists every service as "Checking…" and the live results arrive after load.
    afterNextRender(() => (this.stopWatching = this.status.watch()));
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.stopWatching();
  }

  // #endregion

  // #region Private Methods

  protected recheck(): void {
    void this.status.refresh();
  }

  protected stateId(id: string): string {
    return this.status.results()[id]?.state ?? 'checking';
  }

  protected state(id: string): TranslationKey {
    return `svc.${this.status.results()[id]?.state ?? 'checking'}` as TranslationKey;
  }

  protected source(id: string): TranslationKey {
    return this.status.results()[id]?.source === 'official' ? 'svc.official' : 'svc.probe';
  }

  // #endregion
}

