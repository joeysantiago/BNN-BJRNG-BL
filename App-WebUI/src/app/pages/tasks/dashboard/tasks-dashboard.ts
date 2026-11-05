import { TaskCard } from '../ui/task-card/task-card';
import { TaskIcon } from '../ui/task-icon/task-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { TasksStateService } from '../../../core/tasks-state.service';
import { TaskRequest, TaskTab } from '../../../core/models/tasks.model';
import { formatYmd, isDone, monthLabel } from '../../../core/tasks-dates';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';

/**
 * The task list. The three primary tabs (All, Active, Completed) come first; the date filters (Today, Current week, Next week, Current month,
 * Upcoming, Overdue, No due date, a month, a year) and the category filters (Marketing and the others) narrow the tab, and the search narrows
 * further. Every filter works inside every tab, so "Active + Today" or "Completed + Marketing" show exactly those tasks.
 */
@Component({
  selector: 'app-tasks-dashboard',
  imports: [TaskIcon, TaskCard],
  templateUrl: './tasks-dashboard.html',
  styleUrl: './tasks-dashboard.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksDashboard {
  protected readonly quick = signal('');
  protected readonly formatYmd = formatYmd;
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private closeTimer?: ReturnType<typeof setTimeout>;
  protected readonly state = inject(TasksStateService);
  protected readonly menu = signal<'when' | 'cat' | null>(null);
  protected readonly tabs: TaskTab[] = ['all', 'active', 'completed'];
  protected readonly scopes = ['all', 'today', 'week', 'nextweek', 'month', 'upcoming', 'overdue', 'nodate'];
  protected readonly weekday = computed(() => new Intl.DateTimeFormat(this.state.locale(), { weekday: 'long' }).format(this.state.moment()));
  protected readonly dueToday = computed(() => this.state.tasks().filter((t) => t.dueDate === this.state.clock().today && !isDone(t)).length);
  protected readonly scopeName = computed(() => {
    const s = this.state.scope();
    if (s.startsWith('m:'))
      return this.month(s.slice(2));
    return s.startsWith('y:') ? this.i18n.t('tasks.scope.year', { year: s.slice(2) }) : this.i18n.t('tasks.scope.' + s);
  });
  protected readonly greeting = computed(() => {
    const hour = this.state.moment().getHours();
    const name = (this.auth.user()?.displayName ?? '').split(/\s+/)[0];
    return this.i18n.t(hour < 12 ? 'tasks.greet.morning' : hour < 17 ? 'tasks.greet.afternoon' : 'tasks.greet.evening', { name });
  });
  protected readonly empty = computed(() => {
    if (this.state.scope() === 'overdue' && this.state.tab() === 'completed')
      return this.i18n.t('tasks.empty.overdueDone');
    return this.state.query().trim() ? this.i18n.t('tasks.empty.search', { q: this.state.query().trim() }) : this.i18n.t('tasks.empty.none');
  });

  // #region Public Methods

  leave(): void {
    this.closeTimer = setTimeout(() => this.menu.set(null), 200);
  }

  month(ym: string): string {
    return monthLabel(ym, this.state.locale());
  }

  /** A date filter from the When menu (Today, a month, a year, ...). */
  pick(scope: string): void {
    this.state.scope.set(scope);
    this.menu.set(null);
  }

  setTab(tab: TaskTab): void {
    this.state.tab.set(tab);
    this.state.stopSelecting();
  }

  moveTo(value: string): void {
    if (value)
      void this.state.bulk('category', value === 'none' ? null : Number(value));
  }

  /** The menus open on hover (mouse) and on a tap or click (touch, keyboard); a short delay lets the pointer reach the list. */
  hover(menu: 'when' | 'cat'): void {
    clearTimeout(this.closeTimer);
    this.menu.set(menu);
  }

  toggle(menu: 'when' | 'cat'): void {
    clearTimeout(this.closeTimer);
    this.menu.set(this.menu() === menu ? null : menu);
  }

  /** Quick add: the title only; the due date follows the date filter, the category the category filter, the rest the user's defaults. */
  async addQuick(event: Event): Promise<void> {
    event.preventDefault();
    const title = this.quick().trim();
    if (!title)
      return;
    const s = this.state.settings();
    const category = this.state.category();
    const request: TaskRequest = { title, description: null, dueDate: this.state.quickDue(), dueTime: null, priority: s?.defaultPriority ?? 2, categoryId: category === 'all' ? (s?.defaultCategoryId ?? null) : category, isStarted: false, remindEnabled: true, repeatType: 'none', repeatEvery: 1, repeatUnit: '', checklist: [] };
    if (await this.state.save(null, request))
      this.quick.set('');
  }

  pickCategory(category: number | 'all'): void {
    this.state.category.set(category);
    this.menu.set(null);
  }

  /** A summary card: its tab and date filter (the category and search stay). */
  quickFilter(tab: TaskTab, scope: string): void {
    this.state.tab.set(tab);
    this.state.scope.set(scope);
  }

  // #endregion
}
