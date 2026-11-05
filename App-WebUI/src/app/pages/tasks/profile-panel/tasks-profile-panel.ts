import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { TasksApiService } from '../../../core/tasks-api.service';
import { Component, computed, inject, signal } from '@angular/core';
import { TasksStateService } from '../../../core/tasks-state.service';
import { TasksPanelNotice } from '../settings-panel/tasks-settings-panel.model';

/**
 * My Tasks' part of the Profile page (FEATURE_PROFILE), for a user who may open My Tasks: deleting their My Tasks data (tasks, pictures and settings in this app) and
 * their access to it. The common account, its login and the other apps stay; an administrator keeps access by role and starts again with an empty app.
 * The first press asks again; the second deletes.
 */
@Component({
  selector: 'app-tasks-profile-panel',
  templateUrl: './tasks-profile-panel.html',
  styleUrl: './tasks-profile-panel.scss',
})

export class TasksProfilePanel {
  protected readonly busy = signal(false);
  protected readonly sure = signal(false);
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TasksApiService);
  private readonly state = inject(TasksStateService);
  protected readonly notice = signal<TasksPanelNotice | null>(null);
  protected readonly appName = computed(() => this.i18n.page('tasks'));

  // #region Public Methods

  async remove(): Promise<void> {
    if (!this.sure()) {
      this.sure.set(true);
      return;
    }
    this.sure.set(false);
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = (await this.api.deleteAccount()).message ?? '';
      // The session now has the new app access; the task list starts empty for a user who keeps the app.
      await this.auth.renewSession();
      this.state.tasks.set([]);
      this.notice.set({ text, error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
