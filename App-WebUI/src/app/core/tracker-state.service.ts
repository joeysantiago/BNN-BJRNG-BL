import { I18nService } from './i18n.service';
import { TRACKER_CATEGORIES } from './tracker-meta';
import { TrackerApiService } from './tracker-api.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TrackerData, TrackerDay, TrackerFilter, TrackerFlow, TrackerMonth, TrackerPeriod, TrackerSlice, TrackerTotals, TrackerTxn } from './models/tracker.model';

const DAY = 864e5;

/** The flows that are spending (what was bought), and the ones that take spending back. */
const SPENDING: readonly TrackerFlow[] = ['spend', 'cardSpend', 'emi'];
const REFUNDS: readonly TrackerFlow[] = ['refund', 'cardRefund'];

/**
 * What SnapTracker shows: the data of GET /tracker/state, the open filter, search, transaction and Add sheet, the toasts, and every number the
 * dashboard draws (worked out here from the transactions, as the prototype did). Every list is a computed signal, so a change shows everywhere at once.
 * The numbers are of the chosen period (a month or a year, the current month at first) and follow each transaction's flow: spending is what was
 * bought (bank and card spends and EMIs, less refunds); money out of the bank adds the card bills paid; self transfers and the card's payments count nowhere.
 */
@Injectable({ providedIn: 'root' })

export class TrackerStateService {
  private toastId = 0;
  readonly search = signal('');
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly addOpen = signal(false);
  readonly api = inject(TrackerApiService);
  private readonly i18n = inject(I18nService);
  readonly open = signal<number | null>(null);
  readonly filter = signal<TrackerFilter>('all');
  readonly data = signal<TrackerData | null>(null);
  readonly txns = computed(() => this.data()?.txns ?? []);
  readonly toasts = signal<{ id: number; text: string; error: boolean }[]>([]);
  readonly opened = computed(() => this.txns().find((t) => t.id === this.open()) ?? null);
  readonly unread = computed(() => (this.data()?.alerts ?? []).filter((a) => !a.read).length);
  /** The transactions counted in totals: not ignored and not duplicates. */
  readonly live = computed(() => this.txns().filter((t) => t.status !== 'ignored' && t.status !== 'duplicate'));
  /** The dashboard's period: this month at first; a month of any year, or a whole year. */
  readonly period = signal<TrackerPeriod>({ kind: 'month', year: new Date().getFullYear(), month: new Date().getMonth() });
  readonly pending = computed(() => this.txns().filter((t) => t.status === 'pending').sort((a, b) => b.at.localeCompare(a.at)));
  /** The counted transactions of the period. */
  readonly inPeriod = computed(() => {
    const [from, to] = this.range();
    return this.live().filter((t) => this.ms(t) >= from && this.ms(t) < to);
  });
  /** True while the period is the current month: only then are today's spending and the comparison with last month shown. */
  readonly current = computed(() => {
    const [from, to] = this.range();
    return this.period().kind === 'month' && Date.now() >= from && Date.now() < to;
  });
  readonly recent = computed(() => this.txns().filter((t) => t.source === 'sms').sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.at.localeCompare(a.at)).slice(0, 6));
  /** Start (inclusive) and end (exclusive) of the period, in ms. */
  readonly range = computed<[number, number]>(() => {
    const p = this.period();
    return p.kind === 'year' ? [new Date(p.year, 0, 1).getTime(), new Date(p.year + 1, 0, 1).getTime()] : [new Date(p.year, p.month, 1).getTime(), new Date(p.year, p.month + 1, 1).getTime()];
  });
  /** The period's name in the user's language: "November 2026", or "2026". */
  readonly periodName = computed(() => {
    const p = this.period();
    const locale = { en: 'en-IN', hi: 'hi-IN', ar: 'ar' }[this.i18n.lang()] ?? 'en-IN';
    return new Intl.DateTimeFormat(locale, p.kind === 'year' ? { year: 'numeric' } : { month: 'long', year: 'numeric' }).format(new Date(p.year, p.kind === 'year' ? 0 : p.month, 1));
  });
  /** Spending of each day of the month (so far, for the current month), or of each month of the year (the line under the period's total). */
  readonly daily = computed(() => {
    const p = this.period();
    const length = p.kind === 'year' ? 12 : this.current() ? new Date().getDate() : new Date(p.year, p.month + 1, 0).getDate();
    const out = Array.from({ length }, () => 0);
    for (const t of this.inPeriod()) {
      const i = p.kind === 'year' ? new Date(this.ms(t)).getMonth() : new Date(this.ms(t)).getDate() - 1;
      if (i < length)
        out[i] += this.spent(t);
    }
    return out;
  });
  /** The period's spending by category, biggest first (the donut): bank and card spends and EMIs, never transfers or card bills. */
  readonly slices = computed<TrackerSlice[]>(() => {
    const debits = this.inPeriod().filter((t) => SPENDING.includes(t.flow));
    const total = debits.reduce((a, t) => a + t.amount, 0);
    return TRACKER_CATEGORIES.map((c) => ({ ...c, total: debits.filter((t) => t.category === c.code).reduce((a, t) => a + t.amount, 0) })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total).map((c) => ({ ...c, pct: total ? Math.round((c.total / total) * 100) : 0 }));
  });
  /** Spending and income by month, oldest first (the bar chart): the twelve months of the chosen year, or the six months up to the chosen month. */
  readonly months = computed<TrackerMonth[]>(() => {
    const rows: TrackerMonth[] = [];
    const p = this.period();
    const [first, count] = p.kind === 'year' ? [0, 12] : [p.month - 5, 6];
    for (let i = 0; i < count; i++) {
      const from = new Date(p.year, first + i, 1).getTime();
      const to = new Date(p.year, first + i + 1, 1).getTime();
      const inMonth = this.live().filter((t) => this.ms(t) >= from && this.ms(t) < to);
      const start = new Date(from);
      rows.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, spent: inMonth.reduce((a, t) => a + this.spent(t), 0), income: inMonth.filter((t) => t.flow === 'salary' || t.flow === 'income').reduce((a, t) => a + t.amount, 0) });
    }
    return rows;
  });
  /** The Activity list: the period's transactions of the open filter and search, newest first, grouped by day with each day's net amount. */
  readonly days = computed<TrackerDay[]>(() => {
    const q = this.search().trim().toLowerCase();
    const [from, to] = this.range();
    const list = this.txns().filter((t) => this.ms(t) >= from && this.ms(t) < to && this.passes(t, this.filter())).filter((t) => !q || [t.merchant, this.describe(t), this.i18n.t('tracker.cat.' + t.category), this.i18n.t('tracker.method.' + t.method), t.sms?.body, String(t.amount)].some((v) => v && v.toLowerCase().includes(q))).sort((a, b) => b.at.localeCompare(a.at));
    const groups: TrackerDay[] = [];
    for (const t of list) {
      const label = this.dayLabel(t.at);
      let g = groups[groups.length - 1];
      if (!g || g.label !== label)
        groups.push((g = { label, items: [], net: 0 }));
      g.items.push(t);
      if (t.status !== 'ignored' && t.status !== 'duplicate')
        g.net += t.type === 'debit' ? -t.amount : t.amount;
    }
    return groups;
  });
  /**
   * The period's money: income (salary and other income), money out of the bank (spends, EMIs paid from the bank, card bills paid) and what is left;
   * spending (bank and card spends and EMIs, less refunds); money borrowed. For the current month also today's spending and the change against the
   * same days of last month; the counts of detected, duplicate and ignored messages are of all time.
   */
  readonly totals = computed<TrackerTotals & { todaySpent: number; delta: number | null; detected: number; dups: number; ignored: number }>(() => {
    const L = this.inPeriod();
    const sum = (list: TrackerTxn[]) => list.reduce((a, t) => a + t.amount, 0);
    const by = (...flows: TrackerFlow[]) => sum(L.filter((t) => flows.includes(t.flow)));
    const income = by('salary', 'income');
    const bankSpend = by('spend') - by('refund');
    const cardSpend = by('cardSpend') - by('cardRefund');
    const emi = by('emi');
    const cardBill = by('cardBillPaid');
    const bankOut = by('spend') + sum(L.filter((t) => t.flow === 'emi' && t.method !== 'creditCard')) + cardBill;
    const [from] = this.range();
    const now = Date.now();
    const today = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const prev = new Date(new Date(from).getFullYear(), new Date(from).getMonth() - 1, 1).getTime();
    const spentBetween = (a: number, b: number) => this.live().filter((t) => this.ms(t) >= a && this.ms(t) < b).reduce((n, t) => n + this.spent(t), 0);
    const prevSame = this.current() ? spentBetween(prev, prev + (now - from)) : 0;
    const f = this.data()?.filtered ?? { otp: 0, promo: 0, other: 0, failed: 0, notice: 0, balance: 0 };
    return {
      income, bankSpend, cardSpend, emi, cardBill, bankOut, spending: bankSpend + cardSpend + emi, left: income - bankOut, borrowed: by('loanIn'),
      todaySpent: this.current() ? spentBetween(today, Infinity) : 0, delta: prevSame ? Math.round(((spentBetween(from, now) - prevSame) / prevSame) * 100) : null,
      detected: this.txns().filter((t) => t.source === 'sms').length, dups: this.txns().filter((t) => t.status === 'duplicate').length,
      ignored: f.otp + f.promo + f.other + f.failed + f.notice + f.balance,
    };
  });

  // #region Public Methods

  /** ₹ with Indian grouping; paise only when there are any. */
  money(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  /** DD-MM-YYYY, the date format of the whole site. */
  date(at: string): string {
    const d = new Date(at);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  time(at: string): string {
    const d = new Date(at);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /** One period back (-1) or forward (+1): the month before or after, or the year. */
  shift(step: number): void {
    const p = this.period();
    const d = new Date(p.year, p.kind === 'year' ? 0 : p.month + step, 1);
    this.period.set(p.kind === 'year' ? { ...p, year: p.year + step } : { kind: 'month', year: d.getFullYear(), month: d.getMonth() });
  }

  ms(t: TrackerTxn): number {
    return new Date(t.at).getTime();
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.data.set(await this.api.state());
    } catch {
      this.failed.set(true);
    }
  }

  /** How much a transaction adds to spending: a spend, card spend or EMI its amount, a refund minus its amount, anything else nothing. */
  spent(t: TrackerTxn): number {
    return SPENDING.includes(t.flow) ? t.amount : REFUNDS.includes(t.flow) ? -t.amount : 0;
  }

  /** Today, Yesterday or the date. */
  dayLabel(at: string): string {
    const day = new Date(new Date(at).setHours(0, 0, 0, 0)).getTime();
    const today = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    return day === today ? this.i18n.t('tracker.today') : day === today - DAY ? this.i18n.t('tracker.yesterday') : this.date(at);
  }

  /** The merchant, or "Money received" / "Unknown merchant". */
  title(t: TrackerTxn): string {
    return t.merchant || this.i18n.t(t.type === 'credit' ? 'tracker.noMerchantIn' : 'tracker.noMerchantOut');
  }

  /** The plain-language description, built in the user's language from the transaction's fields. It never invents a merchant the message does not show. */
  describe(t: TrackerTxn): string {
    const p = { amount: this.money(t.amount), merchant: t.merchant ?? '' };
    const m = t.merchant ? 'At' : '';
    if (t.typeGuessed)
      return this.i18n.t('tracker.desc.noType', p);
    if (t.type === 'credit') {
      const kind = t.category === 'salary' ? 'salary' : t.category === 'refund' ? 'refund' : t.method === 'upi' ? 'upiIn' : 'creditIn';
      return this.i18n.t(`tracker.desc.${kind}${t.merchant ? 'From' : ''}`, p);
    }
    if (t.category === 'cash')
      return this.i18n.t('tracker.desc.cash', p);
    if (!t.merchant)
      return this.i18n.t(t.category === 'bills' ? 'tracker.desc.bills' : 'tracker.desc.debitOut', p);
    const kind = t.category === 'entertainment' && t.kind === 'subscription' ? 'subscription' : t.category === 'bills' && (t.kind === 'electricity' || t.kind === 'telecom') ? t.kind : t.category;
    const known = ['food', 'groceries', 'shopping', 'transport', 'fuel', 'travel', 'health', 'entertainment', 'subscription', 'investment', 'electricity', 'telecom', 'bills', 'transfer', 'rent'];
    return this.i18n.t(`tracker.desc.${known.includes(kind) ? kind : 'payment'}${m}`, p);
  }

  count(filter: TrackerFilter): number {
    return this.txns().filter((t) => this.passes(t, filter)).length;
  }

  toast(text: string, error = false): void {
    if (!text)
      return;
    const id = ++this.toastId;
    this.toasts.update((list) => [...list, { id, text, error }]);
    setTimeout(() => this.dismiss(id), error ? 7000 : 4000);
  }

  /** Runs a change, shows its message and takes the new data; a refusal shows the server's message. Resolves true when it worked. */
  async run(call: () => Promise<{ text: string; data: TrackerData }>): Promise<boolean> {
    this.busy.set(true);
    try {
      const res = await call();
      this.data.set(res.data);
      this.toast(res.text);
      return true;
    } catch (e) {
      this.toast((e as Error).message, true);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion

  // #region Private Methods

  private passes(t: TrackerTxn, f: TrackerFilter): boolean {
    const counted = t.status !== 'ignored' && t.status !== 'duplicate';
    switch (f) {
      case 'sms':
        return t.source === 'sms';
      case 'manual':
        return t.source === 'manual';
      case 'pending':
        return t.status === 'pending';
      case 'credit':
        return t.type === 'credit' && counted;
      case 'debit':
        return t.type === 'debit' && counted;
      case 'dup':
        return t.status === 'duplicate';
      case 'ignored':
        return t.status === 'ignored';
      default:
        return true;
    }
  }

  // #endregion
}
