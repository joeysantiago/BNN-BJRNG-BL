import { TrackerForm } from '../tracker-form/tracker-form';
import { TrackerIcon } from '../tracker-icon/tracker-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TrackerStateService } from '../../../../core/tracker-state.service';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TRACKER_CATEGORIES, trackerCategory } from '../../../../core/tracker-meta';
import { TrackerFlow, TrackerTxn, TrackerTxnRequest } from '../../../../core/models/tracker.model';

/**
 * The details of one transaction, beside the list on wide screens and full screen on phones: amount and status, why it waits (or why it is a duplicate),
 * the generated description, the details the reader found, how sure it was, the original SMS with the parts it used marked, and the actions
 * (confirm, edit, change the category, mark what it counts towards, ignore or restore, "not a duplicate", delete). Escape or the backdrop closes it.
 */
@Component({
  selector: 'app-tracker-drawer',
  imports: [TrackerIcon, TrackerForm],
  templateUrl: './tracker-drawer.html',
  host: { '(document:keydown.escape)': 'close()' },
})

export class TrackerDrawer {
  protected readonly sure = signal(false);
  protected readonly remember = signal(true);
  readonly txn = input.required<TrackerTxn>();
  protected readonly i18n = inject(I18nService);
  protected readonly categories = TRACKER_CATEGORIES;
  protected readonly state = inject(TrackerStateService);
  protected readonly cat = computed(() => trackerCategory(this.txn().category));
  protected readonly mode = signal<'view' | 'edit' | 'category' | 'flow'>('view');
  protected readonly dupOf = computed(() => this.state.txns().find((t) => t.id === this.txn().dupOf) ?? null);
  /** The edit form's starting values. */
  protected readonly initial = computed<TrackerTxnRequest>(() => {
    const t = this.txn();
    return { amount: t.amount, type: t.type, merchant: t.merchant, category: t.category, method: t.method, at: t.at, note: t.note };
  });
  /** What money out can count towards, and money in ("Mark as…"). */
  protected readonly flows = computed<TrackerFlow[]>(() => (this.txn().type === 'debit' ? ['spend', 'cardSpend', 'emi', 'cardBillPaid', 'selfTransfer'] : ['salary', 'income', 'refund', 'cardRefund', 'loanIn', 'selfTransfer', 'cardPaymentIn']));
  /** The SMS split into plain and marked parts (amount, merchant, account, reference), so the page can mark them without inserting HTML. */
  protected readonly smsParts = computed(() => {
    const sms = this.txn().sms;
    if (!sms)
      return [];
    const hits = sms.marks.map((m) => ({ start: sms.body.indexOf(m), end: sms.body.indexOf(m) + m.length })).filter((h) => h.start >= 0).sort((a, b) => a.start - b.start);
    const parts: { text: string; mark: boolean }[] = [];
    let at = 0;
    for (const h of hits) {
      if (h.start < at)
        continue;
      parts.push({ text: sms.body.slice(at, h.start), mark: false }, { text: sms.body.slice(h.start, h.end), mark: true });
      at = h.end;
    }
    parts.push({ text: sms.body.slice(at), mark: false });
    return parts.filter((p) => p.text);
  });

  constructor() {
    // Another transaction (for example the original of a duplicate) opens in the details view.
    effect(() => {
      this.txn();
      this.mode.set('view');
      this.sure.set(false);
    });
  }

  // #region Public Methods

  close(): void {
    this.state.open.set(null);
  }

  remove(): void {
    if (!this.sure()) {
      this.sure.set(true);
      return;
    }
    const id = this.txn().id;
    void this.state.run(() => this.state.api.remove(id)).then((ok) => ok && this.close());
  }

  async pick(code: string): Promise<void> {
    if (await this.state.run(() => this.state.api.category(this.txn().id, code, this.remember())))
      this.mode.set('view');
  }

  /** "Mark as…"; remember applies it to the merchant's other transactions, or for an EMI without a merchant to every debit of about this amount. */
  async mark(flow: TrackerFlow): Promise<void> {
    if (await this.state.run(() => this.state.api.flow(this.txn().id, flow, this.remember() && (!!this.txn().merchant || flow === 'emi'))))
      this.mode.set('view');
  }

  async save(request: TrackerTxnRequest): Promise<void> {
    if (await this.state.run(() => this.state.api.edit(this.txn().id, request)))
      this.mode.set('view');
  }

  act(action: 'confirm' | 'ignore' | 'restore' | 'not-duplicate'): void {
    void this.state.run(() => this.state.api.act(this.txn().id, action));
  }

  // #endregion
}
