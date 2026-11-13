import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { TrackerRow } from '../ui/tracker-row/tracker-row';
import { trackerCategory } from '../../../core/tracker-meta';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerPeriod } from '../ui/tracker-period/tracker-period';
import { TrackerPhoneService } from '../../../core/tracker-phone.service';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ViewEncapsulation, computed, inject } from '@angular/core';

/**
 * The SnapTracker dashboard (/tracker/app) of the chosen period (a month or a year, chosen at the top): its spending with a daily (or monthly) line, income,
 * money out of the bank and what is left, card spends and EMIs, spending and income by month, where the money went, what needs your check, and the newest
 * detected transactions. Every number comes from TrackerStateService.
 */
@Component({
  selector: 'app-tracker-dashboard',
  imports: [RouterLink, TrackerIcon, TrackerRow, TrackerPeriod],
  templateUrl: './tracker-dashboard.html',
  styleUrl: './tracker-dashboard.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerDashboard {
  protected readonly cat = trackerCategory;
  protected readonly i18n = inject(I18nService);
  private readonly phone = inject(TrackerPhoneService);
  protected readonly state = inject(TrackerStateService);
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return this.i18n.t(hour < 12 ? 'tracker.greet.morning' : hour < 17 ? 'tracker.greet.afternoon' : 'tracker.greet.evening');
  });
  /** The donut: one arc per category of this month (circumference 100, so each dash length is its percent). */
  protected readonly arcs = computed(() => {
    let offset = 25;
    return this.state.slices().map((s) => {
      const arc = { ...s, dash: `${s.pct} ${100 - s.pct}`, offset: offset };
      offset = (offset - s.pct + 100) % 100;
      return arc;
    });
  });
  /** The daily spending line of this month, as the points of an SVG polyline (300 x 60). */
  protected readonly line = computed(() => {
    const days = this.state.daily();
    const max = Math.max(1, ...days);
    const step = days.length > 1 ? 300 / (days.length - 1) : 300;
    return days.map((v, i) => `${(i * step).toFixed(1)},${(56 - (v / max) * 50).toFixed(1)}`).join(' ');
  });
  /** The months as bars (600 x 200 drawing; six, or the twelve of a year): spending and income side by side, scaled to the biggest month. */
  protected readonly bars = computed(() => {
    const rows = this.state.months();
    const step = 580 / rows.length;
    const width = Math.min(30, step / 2 - 4);
    const max = Math.max(1, ...rows.flatMap((r) => [r.spent, r.income]));
    const fmt = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    return rows.map((r, i) => ({ x: 10 + i * step + (step - 2 * width - 4) / 2, width, step, label: fmt.format(new Date(+r.key.slice(0, 4), +r.key.slice(5, 7) - 1, 1)), spent: (Math.max(0, r.spent) / max) * 150, income: (r.income / max) * 150, title: `${this.state.money(Math.round(r.spent))} / ${this.state.money(Math.round(r.income))}` }));
  });

  // #region Public Methods

  /** In the Android app this first shows the notice and Android's SMS permission popup. */
  enable(): void {
    void this.phone.tracking('enable');
  }

  resume(): void {
    void this.phone.tracking('resume');
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  round(n: number): number {
    return Math.round(n);
  }

  ignore(id: number): void {
    void this.state.run(() => this.state.api.act(id, 'ignore'));
  }

  confirm(id: number): void {
    void this.state.run(() => this.state.api.act(id, 'confirm'));
  }

  // #endregion

  // #region Private Methods

  private locale(): string {
    return { en: 'en-IN', hi: 'hi-IN', ar: 'ar' }[this.i18n.lang()] ?? 'en-IN';
  }

  // #endregion
}
