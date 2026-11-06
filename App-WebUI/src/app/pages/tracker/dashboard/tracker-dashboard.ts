import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n.service';
import { TrackerRow } from '../ui/tracker-row/tracker-row';
import { trackerCategory } from '../../../core/tracker-meta';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { Component, ViewEncapsulation, computed, inject } from '@angular/core';

/**
 * The SnapTracker dashboard (/tracker/app): this month's spending with a daily line, the totals SnapTracker found for you, six months of spending and income,
 * where the money went, what needs your check, and the newest detected transactions. Every number comes from TrackerStateService.
 */
@Component({
  selector: 'app-tracker-dashboard',
  imports: [RouterLink, TrackerIcon, TrackerRow],
  templateUrl: './tracker-dashboard.html',
  styleUrl: './tracker-dashboard.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerDashboard {
  protected readonly cat = trackerCategory;
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TrackerStateService);
  /** "November 2026", in the user's language. */
  protected readonly monthName = computed(() => new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(new Date()));
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
  /** The six months as bars (600 x 200 drawing): spent and income side by side, scaled to the biggest month. */
  protected readonly bars = computed(() => {
    const rows = this.state.months();
    const max = Math.max(1, ...rows.flatMap((r) => [r.spent, r.income]));
    const fmt = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    return rows.map((r, i) => ({ x: 20 + i * 96, label: fmt.format(new Date(+r.key.slice(0, 4), +r.key.slice(5, 7) - 1, 1)), spent: (r.spent / max) * 150, income: (r.income / max) * 150, title: `${this.state.money(Math.round(r.spent))} / ${this.state.money(Math.round(r.income))}` }));
  });

  // #region Public Methods

  enable(): void {
    void this.state.run(() => this.state.api.tracking('enable'));
  }

  resume(): void {
    void this.state.run(() => this.state.api.tracking('resume'));
  }

  sample(): void {
    void this.state.run(() => this.state.api.sample());
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
