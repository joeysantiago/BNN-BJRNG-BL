import { I18nService } from '../../../core/i18n.service';
import { TrackerRow } from '../ui/tracker-row/tracker-row';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerPeriod } from '../ui/tracker-period/tracker-period';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { TrackerAccount, TrackerFlow, TrackerTxn } from '../../../core/models/tracker.model';

/**
 * Credit cards and loans (/tracker/app/cards) for the chosen period: each card's purchases, money back and payments received, its latest statement and its
 * transactions; the card bills paid from the bank; and each loan's EMIs. Every card and loan can get the user's own name. The numbers follow the flows of
 * TrackerStateService, so a card bill is never counted twice: the purchases are spending, the bill paid only leaves the bank.
 */
@Component({
  selector: 'app-tracker-cards',
  imports: [TrackerIcon, TrackerRow, TrackerPeriod],
  templateUrl: './tracker-cards.html',
  styleUrl: './tracker-cards.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerCards {
  protected readonly draft = signal('');
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  protected readonly editing = signal<number | null>(null);
  private readonly accounts = computed(() => this.state.data()?.accounts ?? []);
  /** The card bills paid from a bank account in the period, newest first. */
  protected readonly bills = computed(() => this.newest(this.state.inPeriod().filter((t) => t.flow === 'cardBillPaid')));
  /** The period's totals: card purchases (less money back), bills paid from the bank, EMIs. */
  protected readonly totals = computed(() => ({ cards: this.state.totals().cardSpend, bills: this.state.totals().cardBill, emi: this.state.totals().emi }));
  /** Each loan with its EMI and the EMIs paid in the period. */
  protected readonly loans = computed(() => {
    const list = this.state.inPeriod();
    return this.accounts().filter((a) => a.type === 'loan').map((account) => {
      const txns = this.newest(list.filter((t) => t.loanId === account.id));
      return { account, txns, paid: this.sum(txns, 'emi') };
    });
  });
  /** Each card with the period's purchases, money back, payments received and transactions; the busiest card first. */
  protected readonly cards = computed(() => {
    const list = this.state.inPeriod();
    return this.accounts().filter((a) => a.type === 'card').map((account) => {
      const txns = this.newest(list.filter((t) => t.accountId === account.id));
      return { account, txns, spent: this.sum(txns, 'cardSpend'), back: this.sum(txns, 'cardRefund'), paid: this.sum(txns, 'cardPaymentIn') };
    }).sort((a, b) => b.spent - a.spent || b.txns.length - a.txns.length);
  });

  // #region Public Methods

  cancel(): void {
    this.editing.set(null);
  }

  /** The user's own name for it, or the bank and last digits ("ICICI Bank •• 1003"). */
  name(a: TrackerAccount): string {
    return a.label || `${a.provider || this.i18n.t('tracker.cards.' + a.type)} •• ${a.last4}`;
  }

  rename(a: TrackerAccount): void {
    this.draft.set(a.label ?? '');
    this.editing.set(a.id);
  }

  async save(a: TrackerAccount): Promise<void> {
    if (await this.state.run(() => this.state.api.label(a.id, this.draft().trim() || null)))
      this.editing.set(null);
  }

  // #endregion

  // #region Private Methods

  private newest(list: TrackerTxn[]): TrackerTxn[] {
    return [...list].sort((a, b) => b.at.localeCompare(a.at));
  }

  private sum(list: TrackerTxn[], flow: TrackerFlow): number {
    return list.filter((t) => t.flow === flow).reduce((n, t) => n + t.amount, 0);
  }

  // #endregion
}
