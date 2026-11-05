import { RouterLink } from '@angular/router';
import { TaskIcon } from '../task-icon/task-icon';
import { formatYmd } from '../../../../core/tasks-dates';
import { I18nService } from '../../../../core/i18n.service';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { TasksLockService } from '../../../../core/tasks-lock.service';
import { TasksStateService } from '../../../../core/tasks-state.service';

/** What floats over the My Tasks app: the reminders bell, the full-size picture viewer and the toasts (with Undo where a change can be undone). */
@Component({
  selector: 'app-tasks-overlays',
  imports: [TaskIcon, RouterLink],
  templateUrl: './tasks-overlays.html',
  styleUrl: './tasks-overlays.scss',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
})

export class TasksOverlays {
  protected readonly formatYmd = formatYmd;
  protected readonly i18n = inject(I18nService);
  protected readonly lock = inject(TasksLockService);
  protected readonly state = inject(TasksStateService);

  // #region Public Methods

  move(step: number): void {
    const v = this.state.viewer();
    if (v)
      this.state.viewer.set({ ...v, index: (v.index + step + v.urls.length) % v.urls.length });
  }

  openReminder(id: number): void {
    this.state.bell.set(false);
    this.state.openEditor(this.state.tasks().find((t) => t.id === id) ?? null);
  }

  // #endregion
}
