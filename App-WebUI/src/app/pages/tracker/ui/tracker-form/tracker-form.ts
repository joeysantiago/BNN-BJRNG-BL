import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TRACKER_CATEGORIES, TRACKER_METHODS } from '../../../../core/tracker-meta';
import { TrackerTxnRequest, TrackerType } from '../../../../core/models/tracker.model';

/**
 * The fields of a transaction typed in by hand (Add > Enter manually) or edited (the details drawer): amount, debit or credit, merchant, category, method,
 * date (DD-MM-YYYY, the site's format) and time, and a note. It checks the obvious mistakes; the server checks everything again.
 */
@Component({
  selector: 'app-tracker-form',
  imports: [TrackerIcon],
  templateUrl: './tracker-form.html',
})

export class TrackerForm {
  readonly busy = input(false);
  readonly cancelled = output<void>();
  protected readonly bad = signal(false);
  protected readonly methods = TRACKER_METHODS;
  readonly saved = output<TrackerTxnRequest>();
  protected readonly i18n = inject(I18nService);
  protected readonly categories = TRACKER_CATEGORIES;
  readonly initial = input<TrackerTxnRequest | null>(null);
  protected readonly type = signal<TrackerType | null>(null);
  /** The type shown: the one picked, else the initial one, else debit. */
  protected readonly shownType = computed(() => this.type() ?? this.initial()?.type ?? 'debit');
  protected readonly start = computed(() => {
    const at = new Date(this.initial()?.at ?? Date.now());
    const p = (n: number) => String(n).padStart(2, '0');
    return { date: `${p(at.getDate())}-${p(at.getMonth() + 1)}-${at.getFullYear()}`, time: `${p(at.getHours())}:${p(at.getMinutes())}` };
  });

  // #region Public Methods

  /** Reads the form; a wrong amount or date shows the hint and sends nothing. */
  submit(event: Event, form: HTMLFormElement): void {
    event.preventDefault();
    const f = new FormData(form);
    const amount = Number(String(f.get('amount') ?? '').replace(/,/g, ''));
    const d = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(f.get('date') ?? '').trim());
    const [h, m] = String(f.get('time') ?? '00:00').split(':').map(Number);
    const at = d ? new Date(+d[3], +d[2] - 1, +d[1], h || 0, m || 0) : null;
    const valid = at && at.getDate() === +d![1] && at.getMonth() === +d![2] - 1;
    if (!(amount > 0) || !valid) {
      this.bad.set(true);
      return;
    }
    this.bad.set(false);
    this.saved.emit({ amount, type: this.shownType(), merchant: String(f.get('merchant') ?? '').trim() || null, category: String(f.get('category')), method: String(f.get('method')) as TrackerTxnRequest['method'], at: at!.toISOString(), note: String(f.get('note') ?? '').trim() });
  }

  // #endregion
}
