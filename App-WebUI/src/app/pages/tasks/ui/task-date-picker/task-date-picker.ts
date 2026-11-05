import { TaskIcon } from '../task-icon/task-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { addDays, calendarDays, formatYmd, monthLabel, parseYmd, ymd } from '../../../../core/tasks-dates';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input, model, signal } from '@angular/core';

let nextId = 0;

/**
 * The date picker of My Tasks, the same as SnapKhata's: a button showing the date (DD-MM-YYYY and Today / Tomorrow / the weekday), opening a card
 * (a bottom sheet on phones) with quick choices, a month grid, and month and year views. The value is YYYY-MM-DD; empty means no due date.
 * Keyboard: arrows move by a day or week, Page Up / Down by a month (Shift: a year), Home / End to the week's ends, Escape closes.
 */
@Component({
  selector: 'app-task-date-picker',
  imports: [TaskIcon],
  templateUrl: './task-date-picker.html',
  styleUrl: './task-date-picker.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dp', '[class.is-open]': 'open()', '(document:pointerdown)': 'outside($event)', '(keydown.escape)': 'close(true)' },
})

export class TaskDatePicker {
  protected readonly id = 'tasks-dp-' + ++nextId;
  readonly max = input('');
  readonly min = input('');
  readonly label = input('');
  readonly value = model('');
  protected readonly cursor = signal('');
  protected readonly open = signal(false);
  private readonly host = inject(ElementRef);
  protected readonly i18n = inject(I18nService);
  private readonly state = inject(TasksStateService);
  protected readonly view = signal<'days' | 'months' | 'years'>('days');
  private readonly locale = computed(() => this.state.locale() + '-u-nu-latn');
  protected readonly weekdays = computed(() => {
    const format = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, i + (this.state.clock().sunday ? 0 : 1))));
  });
  protected readonly title = computed(() => {
    const y = Number(this.cursor().slice(0, 4));
    if (this.view() === 'days')
      return monthLabel(this.cursor().slice(0, 7), this.locale());
    return this.view() === 'months' ? String(y) : `${Math.floor(y / 12) * 12} – ${Math.floor(y / 12) * 12 + 11}`;
  });
  protected readonly years = computed(() => {
    const start = Math.floor(Number(this.cursor().slice(0, 4)) / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => {
      const key = String(start + i);
      return { key, label: key, current: key === this.state.clock().today.slice(0, 4), selected: key === this.value().slice(0, 4) };
    });
  });
  /** Quick choices: today, tomorrow and a week from today. */
  protected readonly quick = computed(() => {
    const today = parseYmd(this.state.clock().today);
    return [['tasks.due.today', 0], ['tasks.due.tomorrow', 1], ['tasks.dp.week', 7]].map(([key, days]) => {
      const iso = ymd(addDays(today, days as number));
      return { iso, label: this.i18n.t(key as string), selected: iso === this.value(), disabled: this.blocked(iso) };
    });
  });
  protected readonly months = computed(() => {
    const year = this.cursor().slice(0, 4);
    const format = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    return Array.from({ length: 12 }, (_, m) => {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      return { key, label: format.format(new Date(Number(year), m, 1)), current: key === this.state.clock().today.slice(0, 7), selected: key === this.value().slice(0, 7) };
    });
  });
  protected readonly display = computed(() => {
    const v = this.value();
    if (!v)
      return { main: this.i18n.t('tasks.due.none'), sub: '' };
    const today = this.state.clock().today;
    const near: Record<string, string> = { [today]: 'tasks.due.today', [ymd(addDays(parseYmd(today), 1))]: 'tasks.due.tomorrow', [ymd(addDays(parseYmd(today), -1))]: 'tasks.due.yesterday' };
    return { main: formatYmd(v), sub: near[v] ? this.i18n.t(near[v]) : new Intl.DateTimeFormat(this.locale(), { weekday: 'long' }).format(parseYmd(v)) };
  });
  protected readonly cells = computed(() => {
    const month = this.cursor().slice(0, 7);
    const today = this.state.clock().today;
    const days = calendarDays(month + '-01', false, this.state.clock().sunday);
    const all = days.length === 42 ? days : [...days, ...Array.from({ length: 7 }, (_, i) => addDays(days[34], i + 1))];
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long' });
    return all.map((d) => {
      const iso = ymd(d);
      return { iso, day: d.getDate(), out: iso.slice(0, 7) !== month, today: iso === today, selected: iso === this.value(), disabled: this.blocked(iso), label: `${long.format(d)} ${formatYmd(iso)}` };
    });
  });

  // #region Public Methods

  clear(): void {
    this.value.set('');
    this.close(true);
  }

  toggle(): void {
    if (this.open())
      this.close(false);
    else
      this.show();
  }

  zoomOut(): void {
    this.view.set(this.view() === 'days' ? 'months' : 'years');
  }

  /** Previous or next page: a month, a year, or twelve years. */
  step(n: number): void {
    const d = parseYmd(this.cursor());
    const months = this.view() === 'days' ? n : this.view() === 'months' ? n * 12 : n * 144;
    this.cursor.set(ymd(new Date(d.getFullYear(), d.getMonth() + months, 1)));
  }

  pick(iso: string): void {
    this.value.set(iso);
    this.close(true);
  }

  close(focus: boolean): void {
    if (!this.open())
      return;
    this.open.set(false);
    if (focus)
      (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('.dp-trigger')?.focus();
  }

  outside(event: Event): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(event.target as Node))
      this.close(false);
  }

  pickYear(year: string): void {
    this.cursor.set(year + this.cursor().slice(4));
    this.view.set('months');
  }

  pickMonth(month: string): void {
    this.cursor.set(month + '-01');
    this.view.set('days');
  }

  key(event: KeyboardEvent): void {
    const rtl = this.i18n.dir() === 'rtl';
    const d = parseYmd(this.cursor());
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(d, rtl ? 1 : -1),
      ArrowRight: () => addDays(d, rtl ? -1 : 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      PageUp: () => new Date(d.getFullYear() - (event.shiftKey ? 1 : 0), d.getMonth() - (event.shiftKey ? 0 : 1), d.getDate()),
      PageDown: () => new Date(d.getFullYear() + (event.shiftKey ? 1 : 0), d.getMonth() + (event.shiftKey ? 0 : 1), d.getDate()),
      Home: () => addDays(d, -((d.getDay() + (this.state.clock().sunday ? 0 : 6)) % 7)),
      End: () => addDays(d, 6 - ((d.getDay() + (this.state.clock().sunday ? 0 : 6)) % 7)),
    };
    const move = moves[event.key];
    if (!move)
      return;
    event.preventDefault();
    this.cursor.set(ymd(move()));
    setTimeout(() => (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-iso="${this.cursor()}"]`)?.focus());
  }

  // #endregion

  // #region Private Methods

  private show(): void {
    this.cursor.set(this.value() || this.state.clock().today);
    this.view.set('days');
    this.open.set(true);
    setTimeout(() => (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-iso="${this.cursor()}"]`)?.focus());
  }

  private blocked(iso: string): boolean {
    return (!!this.min() && iso < this.min()) || (!!this.max() && iso > this.max());
  }

  // #endregion
}
