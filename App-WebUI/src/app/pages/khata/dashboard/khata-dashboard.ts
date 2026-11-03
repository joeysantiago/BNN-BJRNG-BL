import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataMoneyPipe } from '../ui/khata-money.pipe';
import { I18nService } from '../../../core/i18n.service';
import { KhataTxRow } from '../ui/khata-tx-row/khata-tx-row';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataCountDirective } from '../ui/khata-count.directive';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataEmptyArt } from '../ui/khata-empty-art/khata-empty-art';
import { compactAmount, formatDate, formatMoney, monthName, todayIso } from '../../../core/khata-format';
import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { KHATA_GAVE, KHATA_GOT, KhataBookSummary, KhataChart, KhataChartBar, KhataChartTip, KhataDelta } from '../../../core/models/khata.model';

const CHART = { width: 640, height: 240, left: 46, right: 6, top: 14, bottom: 30, maxBar: 26 };
const TIP_EDGE = 84;
const TIP_MIN_TOP = 40;
const TOP_MIN_PERCENT = 4;

/**
 * /khata/app/b/:bookId: the book's dashboard. Net balance with "you will get / give", quick actions, this month against last month,
 * six months of money given and received, the biggest balances and the latest entries.
 */
@Component({
  selector: 'app-khata-dashboard',
  templateUrl: './khata-dashboard.html',
  styleUrl: './khata-dashboard.scss',
  imports: [RouterLink, NgTemplateOutlet, KhataIcon, KhataTxRow, KhataEmptyArt, KhataSkeleton, KhataMissing, KhataMoneyPipe, KhataCountDirective],
})

export class KhataDashboard {
  protected readonly got = KHATA_GOT;
  protected readonly gave = KHATA_GAVE;
  protected readonly error = signal('');
  protected readonly missing = signal('');
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly today = formatDate(todayIso());
  private readonly state = inject(KhataStateService);
  protected readonly tip = signal<KhataChartTip | null>(null);
  protected readonly data = signal<KhataBookSummary | null>(null);
  private readonly chartWrap = viewChild<ElementRef<HTMLElement>>('chartWrap');
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly currency = computed(() => this.data()?.book.currency ?? null);
  protected readonly lastMonth = computed(() => this.data()?.months.at(-2) ?? null);
  protected readonly thisMonth = computed(() => this.data()?.months.at(-1) ?? null);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly hasFlow = computed(() => !!this.data()?.months.some((m) => m.gaveMinor || m.gotMinor));
  protected readonly topMax = computed(() => Math.abs(this.data()?.topContacts[0]?.balanceMinor ?? 1) || 1);
  protected readonly gotTotal = computed(() => this.data()?.months.reduce((s, m) => s + m.gotMinor, 0) ?? 0);
  protected readonly gaveTotal = computed(() => this.data()?.months.reduce((s, m) => s + m.gaveMinor, 0) ?? 0);
  protected readonly gotDelta = computed(() => this.delta(this.thisMonth()?.gotMinor ?? 0, this.lastMonth()?.gotMinor ?? 0, true));
  protected readonly net = computed(() => (this.data() ? this.data()!.book.youWillGetMinor - this.data()!.book.youWillGiveMinor : 0));
  protected readonly gaveDelta = computed(() => this.delta(this.thisMonth()?.gaveMinor ?? 0, this.lastMonth()?.gaveMinor ?? 0, false));
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return this.i18n.t(hour < 12 ? 'khata.d.morning' : hour < 17 ? 'khata.d.afternoon' : 'khata.d.evening');
  });
  /** Grouped bars, "you gave" and "you got" side by side per month, on one shared axis. */
  protected readonly chart = computed<KhataChart | null>(() => {
    const data = this.data();
    const cur = this.currency();
    const lang = this.i18n.lang();
    if (!data || !cur)
      return null;
    const plotHeight = CHART.height - CHART.top - CHART.bottom;
    const groupWidth = (CHART.width - CHART.left - CHART.right) / data.months.length;
    const barWidth = Math.min(CHART.maxBar, groupWidth * 0.3);
    const max = Math.max(1, ...data.months.flatMap((m) => [m.gaveMinor, m.gotMinor]));
    const y = (v: number): number => CHART.top + plotHeight - (v / max) * plotHeight;
    const bar = (v: number, x: number): string => (v ? this.barPath(x, y(v), barWidth, CHART.top + plotHeight - y(v)) : '');
    const bars = data.months.map<KhataChartBar>((m, i) => {
      const x = CHART.left + groupWidth * i + groupWidth / 2;
      const longLabel = monthName(m.month, true, lang);
      const gaveText = formatMoney(m.gaveMinor, cur, lang);
      const gotText = formatMoney(m.gotMinor, cur, lang);
      const ariaLabel = `${longLabel}: ${this.i18n.t('khata.e.gave')} ${gaveText}, ${this.i18n.t('khata.e.got')} ${gotText}`;
      return { x, key: m.month, topY: y(Math.max(m.gaveMinor, m.gotMinor)), label: monthName(m.month, false, lang), gavePath: bar(m.gaveMinor, x - barWidth - 1), gotPath: bar(m.gotMinor, x + 1), gaveText, gotText, longLabel, ariaLabel };
    });
    const ticks = [0, 0.5, 1].map((f) => ({ y: y(max * f), label: compactAmount(max * f, cur, lang) }));
    return { width: CHART.width, height: CHART.height, plotTop: CHART.top, plotLeft: CHART.left, plotRight: CHART.width - CHART.right, groupWidth, plotHeight, ticks, bars };
  });

  constructor() {
    effect(() => this.state.screen(this.data()?.book.name ?? this.i18n.t('khata.nav.home')));
    effect(() => {
      const bookId = this.bookId();
      untracked(() => void this.load(bookId));
    });
  }

  // #region Public Methods

  hideTip(): void {
    this.tip.set(null);
  }

  topWidth(balance: number): string {
    return `${Math.max(TOP_MIN_PERCENT, (Math.abs(balance) / this.topMax()) * 100).toFixed(1)}%`;
  }

  /** Shows the tooltip of one month above its bars, kept inside the chart. */
  showTip(bar: KhataChartBar, svg: Element): void {
    const wrap = this.chartWrap()?.nativeElement;
    if (!wrap)
      return;
    const scale = svg.getBoundingClientRect().width / CHART.width;
    this.tip.set({ bar, left: Math.min(Math.max(bar.x * scale, TIP_EDGE), wrap.clientWidth - TIP_EDGE), top: Math.max(bar.topY * scale, TIP_MIN_TOP) });
  }

  // #endregion

  // #region Private Methods

  private async load(bookId: number): Promise<void> {
    if (!bookId)
      return;
    this.data.set(null);
    this.error.set('');
    this.missing.set('');
    this.state.bookId.set(bookId);
    try {
      const data = await this.api.summary(bookId, todayIso());
      if (this.bookId() !== bookId)
        return;
      this.data.set(data);
      if (!data.book.isLastOpened)
        void this.api.openBook(bookId).then(() => this.state.loadBooks()).catch(() => null);
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    }
  }

  /** A bar with rounded top corners. */
  private barPath(x: number, y: number, w: number, h: number): string {
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  /** This month against last month, in percent. `goodUp`: whether a rise is good news (money received) or not (money given). */
  private delta(now: number, before: number, goodUp: boolean): KhataDelta {
    if (!before && !now)
      return { text: this.i18n.t('khata.d.noChange'), tone: 'flat', icon: null };
    if (!before)
      return { text: this.i18n.t('khata.d.new'), tone: goodUp ? 'up' : 'down', icon: 'trend' };
    const pct = Math.round(((now - before) / before) * 100);
    const up = pct >= 0;
    return { text: this.i18n.t('khata.d.vsLast', { pct: `${up ? '+' : ''}${pct}%` }), tone: pct === 0 ? 'flat' : up === goodUp ? 'up' : 'down', icon: up ? 'gave' : 'got' };
  }

  // #endregion
}
