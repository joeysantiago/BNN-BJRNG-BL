import { I18nService } from './i18n.service';
import { TRACKER_CATEGORIES } from './tracker-meta';
import { TrackerApiService } from './tracker-api.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TrackerData, TrackerDay, TrackerFilter, TrackerMonth, TrackerSlice, TrackerTxn } from './models/tracker.model';

const DAY = 864e5;

/**
 * What SnapTracker shows: the data of GET /tracker/state, the open filter, search, transaction and Add sheet, the toasts, and every number the
 * dashboard draws (worked out here from the transactions, as the prototype did). Every list is a computed signal, so a change shows everywhere at once.
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
  readonly pending = computed(() => this.txns().filter((t) => t.status === 'pending').sort((a, b) => b.at.localeCompare(a.at)));
  readonly recent = computed(() => this.txns().filter((t) => t.source === 'sms').sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.at.localeCompare(a.at)).slice(0, 6));
  /** Spending of each day of this month so far (the line under the month's total). */
  readonly daily = computed(() => {
    const month = this.startOfMonth(Date.now());
    const days = new Date().getDate();
    const out = Array.from({ length: days }, () => 0);
    this.live().filter((t) => t.type === 'debit' && this.ms(t) >= month).forEach((t) => (out[new Date(this.ms(t)).getDate() - 1] += t.amount));
    return out;
  });
  /** This month's spending by category, biggest first (the donut). */
  readonly slices = computed<TrackerSlice[]>(() => {
    const month = this.startOfMonth(Date.now());
    const debits = this.live().filter((t) => t.type === 'debit' && this.ms(t) >= month);
    const total = debits.reduce((a, t) => a + t.amount, 0);
    return TRACKER_CATEGORIES.map((c) => ({ ...c, total: debits.filter((t) => t.category === c.code).reduce((a, t) => a + t.amount, 0) })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total).map((c) => ({ ...c, pct: total ? Math.round((c.total / total) * 100) : 0 }));
  });
  /** Spent and income of the last six months, oldest first (the bar chart). */
  readonly months = computed<TrackerMonth[]>(() => {
    const rows: TrackerMonth[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const inMonth = this.live().filter((t) => this.ms(t) >= from && this.ms(t) < to);
      const start = new Date(from);
      rows.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, spent: inMonth.filter((t) => t.type === 'debit').reduce((a, t) => a + t.amount, 0), income: inMonth.filter((t) => t.type === 'credit').reduce((a, t) => a + t.amount, 0) });
    }
    return rows;
  });
  /** The Activity list: the open filter and search, newest first, grouped by day with each day's net amount. */
  readonly days = computed<TrackerDay[]>(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.txns().filter((t) => this.passes(t, this.filter())).filter((t) => !q || [t.merchant, this.describe(t), this.i18n.t('tracker.cat.' + t.category), this.i18n.t('tracker.method.' + t.method), t.sms?.body, String(t.amount)].some((v) => v && v.toLowerCase().includes(q))).sort((a, b) => b.at.localeCompare(a.at));
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
  /** The dashboard's numbers for this month and today, and how this month compares with the same days of last month. */
  readonly totals = computed(() => {
    const now = Date.now();
    const month = this.startOfMonth(now);
    const prev = this.startOfMonth(month - DAY);
    const today = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const L = this.live();
    const sum = (list: TrackerTxn[]) => list.reduce((a, t) => a + t.amount, 0);
    const debits = (from: number, to = Infinity) => L.filter((t) => t.type === 'debit' && this.ms(t) >= from && this.ms(t) < to);
    const spent = sum(debits(month));
    const prevSame = sum(debits(prev, prev + (now - month)));
    const smsDebits = L.filter((t) => t.source === 'sms' && t.type === 'debit');
    const smsCredits = L.filter((t) => t.source === 'sms' && t.type === 'credit');
    const f = this.data()?.filtered ?? { otp: 0, promo: 0, other: 0, failed: 0 };
    return {
      spent, todaySpent: sum(debits(today)), todayCount: debits(today).length, delta: prevSame ? Math.round(((spent - prevSame) / prevSame) * 100) : null,
      income: sum(L.filter((t) => t.type === 'credit' && this.ms(t) >= month)), autoDebits: sum(smsDebits), autoDebitCount: smsDebits.length, incomeAll: sum(smsCredits), incomeCount: smsCredits.length,
      detected: this.txns().filter((t) => t.source === 'sms').length, autoApproved: this.txns().filter((t) => t.status === 'auto').length, manual: this.txns().filter((t) => t.source === 'manual').length,
      dups: this.txns().filter((t) => t.status === 'duplicate').length, ignoredOnPhone: f.otp + f.promo + f.other + f.failed,
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

  private startOfMonth(t: number): number {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }

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
