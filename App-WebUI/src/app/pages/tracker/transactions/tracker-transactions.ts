import { map } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../../core/i18n.service';
import { TrackerRow } from '../ui/tracker-row/tracker-row';
import { TRACKER_FILTERS } from '../../../core/tracker-meta';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerFilter } from '../../../core/models/tracker.model';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ElementRef, ViewEncapsulation, effect, inject, signal, untracked } from '@angular/core';

/**
 * Activity (/tracker/app/transactions): every transaction, filtered (?f=pending, ?f=dup, …) and searched, newest first, grouped by day with the day's net amount.
 * The filters sit behind one button beside the search (a list with each filter's count), so they never push the screen sideways on a phone; the filter in
 * use shows as a chip that clears it.
 */
@Component({
  selector: 'app-tracker-transactions',
  imports: [TrackerIcon, TrackerRow],
  templateUrl: './tracker-transactions.html',
  styleUrl: './tracker-transactions.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '(document:click)': 'outside($event)', '(document:keydown.escape)': 'menu.set(false)' },
})

export class TrackerTransactions {
  protected readonly menu = signal(false);
  protected readonly filters = TRACKER_FILTERS;
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
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

  /** A click outside the filter button and its list closes the list. */
  outside(event: Event): void {
    if (this.menu() && !this.host.nativeElement.querySelector('.fmenu')?.contains(event.target as Node))
      this.menu.set(false);
  }

  pick(f: TrackerFilter): void {
    this.state.filter.set(f);
    this.menu.set(false);
  }

  // #endregion
}
