import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TrackerPeriodKind } from '../../../../core/models/tracker.model';
import { TrackerStateService } from '../../../../core/tracker-state.service';
import { Component, ViewEncapsulation, computed, inject } from '@angular/core';

/**
 * The period of SnapTracker's numbers (TrackerStateService.period), at the top of the dashboard and the Cards page: Month | Year, and the period with back and
 * next (nothing after the current month or year). Choosing Month in the current year goes to the current month.
 */
@Component({
  selector: 'app-tracker-period',
  imports: [TrackerIcon],
  templateUrl: './tracker-period.html',
  styleUrl: './tracker-period.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerPeriod {
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  /** The current month or year is the latest period: there is nothing after it. */
  protected readonly latest = computed(() => {
    const p = this.state.period();
    const now = new Date();
    return p.kind === 'year' ? p.year >= now.getFullYear() : p.year > now.getFullYear() || (p.year === now.getFullYear() && p.month >= now.getMonth());
  });

  // #region Public Methods

  setKind(kind: TrackerPeriodKind): void {
    const p = this.state.period();
    const now = new Date();
    this.state.period.set({ kind, year: p.year, month: kind === 'month' && p.year === now.getFullYear() ? now.getMonth() : p.month });
  }

  // #endregion
}
