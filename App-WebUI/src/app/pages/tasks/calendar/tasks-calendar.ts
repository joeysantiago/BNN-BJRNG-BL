import { TaskCard } from '../ui/task-card/task-card';
import { TaskIcon } from '../ui/task-icon/task-icon';
import { I18nService } from '../../../core/i18n.service';
import { TasksStateService } from '../../../core/tasks-state.service';
import { TaskCalendarDay, TaskItem } from '../../../core/models/tasks.model';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { addDays, calendarDays, formatYmd, isDone, isOverdue, monthLabel, parseYmd, sortTasks, ymd } from '../../../core/tasks-dates';

/** Tasks on their due dates, by month or by week. Pick a day to see its tasks, or add a task straight on that day. */
@Component({
  selector: 'app-tasks-calendar',
  imports: [TaskIcon, TaskCard],
  templateUrl: './tasks-calendar.html',
  styleUrl: './tasks-calendar.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksCalendar {
  protected readonly isDone = isDone;
  protected readonly day = signal('');
  protected readonly month = signal('');
  protected readonly week = signal(false);
  protected readonly formatYmd = formatYmd;
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TasksStateService);
  protected readonly limit = computed(() => (this.week() ? 6 : 2));
  protected readonly dayTasks = computed(() => sortTasks(this.byDay().get(this.day()) ?? [], this.state.clock(), 'all', 'due'));
  protected readonly heading = computed(() => (this.week() ? this.i18n.t('tasks.cal.weekOf', { date: formatYmd(this.days()[0].key) }) : monthLabel(this.month(), this.state.locale())));
  protected readonly byDay = computed(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of this.state.tasks())
      if (t.dueDate)
        map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    return map;
  });
  /** Short weekday names in the language of the reader, from the first day of the week (Intl; 1 January 2024 was a Monday). */
  protected readonly weekdays = computed(() => {
    const format = new Intl.DateTimeFormat(this.state.locale(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, i + (this.state.clock().sunday ? 0 : 1))));
  });
  protected readonly days = computed<TaskCalendarDay[]>(() => {
    const clock = this.state.clock();
    return calendarDays(this.week() ? this.day() : this.month() + '-01', this.week(), clock.sunday).map((d) => {
      const key = ymd(d);
      return { key, day: d.getDate(), out: !this.week() && key.slice(0, 7) !== this.month(), today: key === clock.today, tasks: this.byDay().get(key) ?? [] };
    });
  });

  constructor() {
    this.select(this.state.clock().today);
  }

  // #region Public Methods

  today(): void {
    this.select(this.state.clock().today);
  }

  move(step: number): void {
    if (this.week()) {
      this.select(ymd(addDays(parseYmd(this.day()), step * 7)));
      return;
    }
    const [y, m] = this.month().split('-').map(Number);
    const first = new Date(y, m - 1 + step, 1);
    this.month.set(ymd(first).slice(0, 7));
    this.day.set(ymd(first));
  }

  select(key: string): void {
    this.day.set(key);
    this.month.set(key.slice(0, 7));
  }

  overdue(task: TaskItem): boolean {
    return isOverdue(task, this.state.clock());
  }

  // #endregion
}
