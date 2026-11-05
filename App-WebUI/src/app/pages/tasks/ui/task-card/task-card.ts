import { TaskIcon } from '../task-icon/task-icon';
import { I18nService } from '../../../../core/i18n.service';
import { TaskItem } from '../../../../core/models/tasks.model';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { formatYmd, isDone, statusOf, timeOf, ymd } from '../../../../core/tasks-dates';

const PRIORITY = ['', 'low', 'medium', 'high'];

/** One task in a list: circular check (complete / reopen), title, due date, status, category, priority, repeat, pictures, checklist progress, and the checklist itself when opened. */
@Component({
  selector: 'app-task-card',
  imports: [TaskIcon],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TaskCard {
  protected readonly timeOf = timeOf;
  protected readonly formatYmd = formatYmd;
  readonly task = input.required<TaskItem>();
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(TasksStateService);
  protected readonly done = computed(() => isDone(this.task()));
  protected readonly total = computed(() => this.task().checklist.length);
  protected readonly open = computed(() => this.state.expanded().has(this.task().id));
  protected readonly picked = computed(() => this.state.selected().has(this.task().id));
  protected readonly status = computed(() => statusOf(this.task(), this.state.clock()));
  protected readonly priority = computed(() => PRIORITY[this.task().priority] ?? 'medium');
  protected readonly category = computed(() => this.state.categoryOf(this.task().categoryId));
  protected readonly ticked = computed(() => this.task().checklist.filter((c) => c.isDone).length);
  protected readonly percent = computed(() => (this.total() ? Math.round((this.ticked() / this.total()) * 100) : 0));
  protected readonly completedOn = computed(() => (this.task().completedOn ? formatYmd(ymd(new Date(this.task().completedOn!))) : ''));
  protected readonly dueClass = computed(() => (this.status() === 'overdue' ? 'od' : this.task().dueDate === this.state.clock().today ? 'td' : ''));
  protected readonly repeat = computed(() => {
    const t = this.task();
    if (t.repeatType === 'none')
      return '';
    if (t.repeatType !== 'custom')
      return this.i18n.t('tasks.repeat.' + t.repeatType);
    return this.i18n.t('tasks.repeat.every', { n: t.repeatEvery, unit: this.i18n.t(`tasks.unit.${t.repeatUnit}${t.repeatEvery > 1 ? 's' : ''}`) });
  });

  // #region Public Methods

  main(): void {
    if (this.state.selecting())
      this.state.pick(this.task());
    else
      this.state.openEditor(this.task());
  }

  /** Opens the pictures of the task full size, at the first one. */
  photos(): void {
    this.state.viewer.set({ index: 0, urls: this.task().attachments.map((a) => this.state.photoUrl(a.id)) });
  }

  // #endregion
}
