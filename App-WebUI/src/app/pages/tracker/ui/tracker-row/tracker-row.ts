import { I18nService } from '../../../../core/i18n.service';
import { trackerCategory } from '../../../../core/tracker-meta';
import { TrackerTxn } from '../../../../core/models/tracker.model';
import { Component, computed, inject, input } from '@angular/core';
import { TrackerStateService } from '../../../../core/tracker-state.service';

/** One transaction in a list (Dashboard, Activity): category, merchant, description, time, method, source, amount and status. Opens its details. */
@Component({
  selector: 'app-tracker-row',
  templateUrl: './tracker-row.html',
  host: { style: 'display: contents' },
})

export class TrackerRow {
  readonly txn = input.required<TrackerTxn>();
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  protected readonly cat = computed(() => trackerCategory(this.txn().category));
  protected readonly dim = computed(() => this.txn().status === 'ignored' || this.txn().status === 'duplicate');
}
