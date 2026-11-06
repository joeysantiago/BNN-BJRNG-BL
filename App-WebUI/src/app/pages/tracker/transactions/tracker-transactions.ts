import { map } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../../core/i18n.service';
import { TrackerRow } from '../ui/tracker-row/tracker-row';
import { TRACKER_FILTERS } from '../../../core/tracker-meta';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerFilter } from '../../../core/models/tracker.model';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ViewEncapsulation, effect, inject, untracked } from '@angular/core';

/** Activity (/tracker/app/transactions): every transaction, filtered (?f=pending, ?f=dup, …) and searched, newest first, grouped by day with the day's net amount. */
@Component({
  selector: 'app-tracker-transactions',
  imports: [TrackerIcon, TrackerRow],
  templateUrl: './tracker-transactions.html',
  styleUrl: './tracker-transactions.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerTransactions {
  protected readonly filters = TRACKER_FILTERS;
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('f'))));

  constructor() {
    // A link with ?f= (the dashboard tiles) opens that list.
    effect(() => {
      const f = this.query();
      if (f && TRACKER_FILTERS.includes(f as TrackerFilter))
        untracked(() => this.state.filter.set(f as TrackerFilter));
    });
  }

  // #region Public Methods

  abs(n: number): number {
    return Math.abs(Math.round(n));
  }

  // #endregion
}
