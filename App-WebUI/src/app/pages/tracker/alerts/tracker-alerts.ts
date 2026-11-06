import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TRACKER_ALERT_ICONS } from '../../../core/tracker-meta';
import { TrackerAlert } from '../../../core/models/tracker.model';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ViewEncapsulation, computed, inject } from '@angular/core';

/** Alerts (/tracker/app/alerts, the bell): what SnapTracker told you, newest first. Which alerts you get is set in Settings > General > SnapTracker. */
@Component({
  selector: 'app-tracker-alerts',
  imports: [RouterLink, TrackerIcon],
  templateUrl: './tracker-alerts.html',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerAlerts {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = TRACKER_ALERT_ICONS;
  protected readonly state = inject(TrackerStateService);
  protected readonly alerts = computed(() => this.state.data()?.alerts ?? []);

  // #region Public Methods

  readAll(): void {
    void this.state.run(() => this.state.api.readAlerts());
  }

  /** Just now, minutes or hours ago, or the date. */
  ago(at: string): string {
    const s = Math.round((Date.now() - new Date(at).getTime()) / 1000);
    if (s < 60)
      return this.i18n.t('tracker.ago.now');
    if (s < 3600)
      return this.i18n.t('tracker.ago.min', { n: Math.floor(s / 60) });
    return s < 86400 ? this.i18n.t('tracker.ago.hour', { n: Math.floor(s / 3600) }) : this.state.date(at);
  }

  open(a: TrackerAlert): void {
    if (a.txnId !== null && this.state.txns().some((t) => t.id === a.txnId))
      this.state.open.set(a.txnId);
  }

  /** The alert's line: the transaction's merchant and amount, or what changed. */
  line(a: TrackerAlert): string {
    if (a.txnId === null)
      return this.i18n.t('tracker.alert.' + a.type + '.p');
    const name = String(a.args['merchant'] || this.i18n.t(a.args['credit'] ? 'tracker.noMerchantIn' : 'tracker.noMerchantOut'));
    return `${name} ${a.args['credit'] ? '+' : '−'}${this.state.money(Number(a.args['amount']))}`;
  }

  // #endregion
}
