import { KhataIcon } from '../khata-icon/khata-icon';
import { I18nService } from '../../../../core/i18n.service';
import { formatDate, todayIso } from '../../../../core/khata-format';
import { Component, ElementRef, computed, inject, input, model, output, signal } from '@angular/core';
import { addDays, addMonths, clampDay, dayDate, daysBetween, monthEnd, monthStart, weekday } from '../../../../core/khata-dates';
import { KhataDateCell, KhataDateDisplay, KhataDateMode, KhataDatePreset, KhataDateQuick, KhataDateRange, KhataDateView, KhataPickCell } from '../../../../core/models/khata.model';

const YEARS_PER_PAGE = 12;
/** A known Sunday, to name the weekdays in the reader's language. */
const A_SUNDAY = '2023-01-01';
const PRESETS: KhataDatePreset[] = ['all', 'last7', 'last30', 'thisMonth', 'lastMonth', 'thisYear'];
const QUICK: KhataDateQuick[] = [{ key: 'khata.dp.today', days: 0 }, { key: 'khata.dp.yesterday', days: 1 }, { key: 'khata.dp.weekAgo', days: 7 }];
let nextId = 0;

/**
 * SnapKhata date picker, in place of the browser's date input. One day (`[(value)]`) or a range (`mode="range"`, `[from]`, `[to]`, `(rangeChange)`).
 * The button shows DD-MM-YYYY (App-Document/date-format.md) with a hint such as "Yesterday"; the calendar opens below it, or as a bottom sheet on a phone.
 * It has one-tap days or ranges, month and year views, weekday and month names in the reader's language, and full keyboard use
 * (arrows, Page Up / Down, Home / End, Enter, Escape; the arrows follow the reading direction in Arabic).
 */
@Component({
  selector: 'app-khata-date-picker',
  imports: [KhataIcon],
  templateUrl: './khata-date-picker.html',
  host: { class: 'k-dp', '[class.is-open]': 'open()', '(document:pointerdown)': 'outside($event)', '(keydown.escape)': 'close(true)' },
})

export class KhataDatePicker {
  protected readonly id = `k-dp-${++nextId}`;
  readonly to = input('');
  readonly max = input('');
  readonly min = input('');
  readonly from = input('');
  readonly label = input('');
  readonly value = model('');
  readonly invalid = input(false);
  private readonly today = todayIso();
  protected readonly presets = PRESETS;
  protected readonly hover = signal('');
  protected readonly anchor = signal('');
  protected readonly open = signal(false);
  protected readonly i18n = inject(I18nService);
  protected readonly cursor = signal(todayIso());
  readonly mode = input<KhataDateMode>('single');
  readonly rangeChange = output<KhataDateRange>();
  protected readonly view = signal<KhataDateView>('days');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly canPrev = computed(() => !this.min() || this.stepTo(-1).to >= this.min());
  protected readonly canNext = computed(() => !this.max() || this.stepTo(1).from <= this.max());
  /** Western digits in every language, like the DD-MM-YYYY dates elsewhere in the app. */
  private readonly locale = computed(() => `${this.i18n.info().locale.replace('_', '-')}-u-nu-latn`);
  protected readonly activePreset = computed(() => PRESETS.find((p) => this.same(this.presetRange(p))) ?? null);
  protected readonly hint = computed(() => (this.mode() === 'range' ? this.i18n.t(this.anchor() ? 'khata.dp.pickEnd' : 'khata.dp.pickStart') : ''));
  /** The one-tap days of the single picker, as their dates; a day outside min / max is greyed out. */
  protected readonly quickDays = computed<KhataPickCell[]>(() => QUICK.map((q) => {
    const iso = addDays(this.today, -q.days);
    return { key: iso, label: this.i18n.t(q.key), current: false, disabled: !this.allowed(iso), selected: this.value() === iso };
  }));
  protected readonly weekdays = computed(() => {
    const short = new Intl.DateTimeFormat(this.locale(), { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => short.format(dayDate(addDays(A_SUNDAY, (this.firstDay() + i) % 7))));
  });
  /** The first column of the month grid: the locale's first day of the week (Sunday when the browser can't tell). */
  private readonly firstDay = computed(() => {
    try {
      const loc = new Intl.Locale(this.locale()) as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } };
      return (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay ?? 7;
    } catch {
      return 7;
    }
  });
  protected readonly years = computed<KhataPickCell[]>(() => {
    const year = Number(this.cursor().slice(0, 4));
    const first = year - (year % YEARS_PER_PAGE);
    return Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
      const key = String(first + i);
      return { key, label: key, current: key === this.today.slice(0, 4), disabled: !this.overlaps(`${key}-01-01`, `${key}-12-31`), selected: Number(key) === year };
    });
  });
  protected readonly title = computed(() => {
    const cursor = this.cursor();
    const year = Number(cursor.slice(0, 4));
    if (this.view() === 'years') {
      const first = year - (year % YEARS_PER_PAGE);
      return `${first} – ${first + YEARS_PER_PAGE - 1}`;
    }
    return this.view() === 'months' ? String(year) : new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dayDate(cursor));
  });
  protected readonly months = computed<KhataPickCell[]>(() => {
    const year = this.cursor().slice(0, 4);
    const name = new Intl.DateTimeFormat(this.locale(), { month: 'short', timeZone: 'UTC' });
    const picked = this.mode() === 'range' ? '' : this.value().slice(0, 7);
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const start = `${key}-01`;
      return { key, label: name.format(dayDate(start)), current: key === this.today.slice(0, 7), disabled: !this.overlaps(start, monthEnd(start)), selected: key === picked };
    });
  });
  protected readonly display = computed<KhataDateDisplay>(() => {
    if (this.mode() === 'single') {
      const value = this.value();
      return { main: value ? formatDate(value) : this.i18n.t('khata.dp.choose'), sub: value ? this.relative(value) : '' };
    }
    const from = this.from();
    const to = this.to();
    const preset = this.activePreset();
    const main = from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? this.i18n.t('khata.dp.from', { date: formatDate(from) }) : to ? this.i18n.t('khata.dp.until', { date: formatDate(to) }) : this.i18n.t('khata.dp.allDates');
    const sub = preset && preset !== 'all' ? this.i18n.t('khata.dp.' + preset) : from && to ? this.i18n.t('khata.dp.days', { n: daysBetween(from, to) + 1 }) : '';
    return { main, sub };
  });
  protected readonly cells = computed<KhataDateCell[]>(() => {
    const cursor = this.cursor();
    const start = monthStart(cursor);
    const first = addDays(start, -((weekday(start) - (this.firstDay() % 7) + 7) % 7));
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', timeZone: 'UTC' });
    const [a, b] = this.ends();
    return Array.from({ length: 42 }, (_, i) => {
      const iso = addDays(first, i);
      return {
        day: Number(iso.slice(8)),
        iso,
        end: !!b && iso === b,
        label: `${long.format(dayDate(iso))}, ${formatDate(iso)}`,
        start: !!a && iso === a,
        today: iso === this.today,
        inRange: !!a && !!b && iso > a && iso < b,
        outside: iso.slice(0, 7) !== cursor.slice(0, 7),
        disabled: !this.allowed(iso),
        selected: iso === a || iso === b,
      };
    });
  });

  // #region Public Methods

  toggle(): void {
    if (this.open())
      this.close(false);
    else
      this.show();
  }

  zoomOut(): void {
    this.view.set(this.view() === 'days' ? 'months' : 'years');
  }

  step(dir: number): void {
    const months = this.view() === 'days' ? 1 : this.view() === 'months' ? 12 : 12 * YEARS_PER_PAGE;
    this.cursor.set(addMonths(this.cursor(), dir * months));
  }

  close(focus: boolean): void {
    if (!this.open())
      return;
    this.open.set(false);
    this.anchor.set('');
    this.hover.set('');
    if (focus)
      this.host.nativeElement.querySelector<HTMLElement>('.k-dp-trigger')?.focus();
  }

  pickYear(year: string): void {
    this.cursor.set(clampDay(addMonths(`${year}-01-01`, Number(this.cursor().slice(5, 7)) - 1), this.min(), this.max()));
    this.view.set('months');
  }

  pickMonth(key: string): void {
    this.cursor.set(clampDay(`${key}-01`, this.min(), this.max()));
    this.view.set('days');
    this.focusCursor();
  }

  quickPick(iso: string): void {
    this.value.set(iso);
    this.close(true);
  }

  /** Arrow keys move through the days (swapped left / right in Arabic), Page Up / Down by month (with Shift by year), Home / End to the week's ends. */
  key(ev: KeyboardEvent): void {
    const rtl = this.i18n.dir() === 'rtl';
    const cursor = this.cursor();
    const col = (weekday(cursor) - (this.firstDay() % 7) + 7) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, rtl ? 1 : -1),
      ArrowRight: () => addDays(cursor, rtl ? -1 : 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, ev.shiftKey ? -12 : -1),
      PageDown: () => addMonths(cursor, ev.shiftKey ? 12 : 1),
      Home: () => addDays(cursor, -col),
      End: () => addDays(cursor, 6 - col),
    };
    const move = moves[ev.key];
    if (!move)
      return;
    ev.preventDefault();
    this.cursor.set(clampDay(move(), this.min(), this.max()));
    this.focusCursor();
  }

  pick(cell: KhataDateCell): void {
    if (cell.disabled)
      return;
    if (this.mode() === 'single') {
      this.value.set(cell.iso);
      this.close(true);
      return;
    }
    const anchor = this.anchor();
    if (!anchor) {
      this.anchor.set(cell.iso);
      this.cursor.set(cell.iso);
      return;
    }
    this.rangeChange.emit(anchor <= cell.iso ? { from: anchor, to: cell.iso } : { from: cell.iso, to: anchor });
    this.close(true);
  }

  outside(ev: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(ev.target as Node))
      this.close(false);
  }

  choosePreset(preset: KhataDatePreset): void {
    this.rangeChange.emit(this.presetRange(preset));
    this.close(true);
  }

  // #endregion

  // #region Private Methods

  private show(): void {
    const start = this.mode() === 'single' ? this.value() : this.to() || this.from();
    this.cursor.set(clampDay(start || this.today, this.min(), this.max()));
    this.view.set('days');
    this.anchor.set('');
    this.open.set(true);
    this.focusCursor();
  }

  private focusCursor(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-iso="${this.cursor()}"]`)?.focus());
  }

  /** The two ends to highlight: the picked day; while choosing a range, the first tap and the day under the pointer; else the saved range. */
  private ends(): [string, string] {
    if (this.mode() === 'single')
      return [this.value(), ''];
    const anchor = this.anchor();
    if (!anchor)
      return [this.from(), this.to()];
    const other = this.hover() || anchor;
    return anchor <= other ? [anchor, other] : [other, anchor];
  }

  private allowed(iso: string): boolean {
    return (!this.min() || iso >= this.min()) && (!this.max() || iso <= this.max());
  }

  private relative(iso: string): string {
    const days = daysBetween(iso, this.today);
    if (days === 0)
      return this.i18n.t('khata.dp.today');
    if (days === 1)
      return this.i18n.t('khata.dp.yesterday');
    if (days > 1 && days < 7)
      return this.i18n.t('khata.dp.daysAgo', { n: days });
    return new Intl.DateTimeFormat(this.locale(), { weekday: 'long', timeZone: 'UTC' }).format(dayDate(iso));
  }

  /** The first and last day of the page one step away (month, year or page of years), to grey out the arrows at the min / max. */
  private stepTo(dir: number): KhataDateRange {
    const next = addMonths(this.cursor(), dir * (this.view() === 'days' ? 1 : this.view() === 'months' ? 12 : 12 * YEARS_PER_PAGE));
    if (this.view() === 'days')
      return { from: monthStart(next), to: monthEnd(next) };
    const year = Number(next.slice(0, 4));
    const first = this.view() === 'months' ? year : year - (year % YEARS_PER_PAGE);
    const last = this.view() === 'months' ? year : first + YEARS_PER_PAGE - 1;
    return { from: `${first}-01-01`, to: `${last}-12-31` };
  }

  private same(range: KhataDateRange): boolean {
    return range.from === this.from() && range.to === this.to();
  }

  private overlaps(start: string, end: string): boolean {
    return (!this.min() || end >= this.min()) && (!this.max() || start <= this.max());
  }

  private presetRange(preset: KhataDatePreset): KhataDateRange {
    const today = this.today;
    const lastMonth = addMonths(monthStart(today), -1);
    const ranges: Record<KhataDatePreset, KhataDateRange> = {
      all: { from: '', to: '' },
      last7: { from: addDays(today, -6), to: today },
      last30: { from: addDays(today, -29), to: today },
      thisMonth: { from: monthStart(today), to: today },
      lastMonth: { from: lastMonth, to: monthEnd(lastMonth) },
      thisYear: { from: `${today.slice(0, 4)}-01-01`, to: today },
    };
    return ranges[preset];
  }

  // #endregion
}
