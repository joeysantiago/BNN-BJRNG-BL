import { TaskIcon } from '../../ui/task-icon/task-icon';
import { ApiService } from '../../../../core/api.service';
import { formatDate } from '../../../../core/date-format';
import { AuthService } from '../../../../core/auth.service';
import { I18nService } from '../../../../core/i18n.service';
import { UserAvatar } from '../../../../shared/user-avatar';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { AuthUser, UserAccess } from '../../../../core/models/auth.model';
import { TaskNotice, TaskUserStatus } from '../../../../core/models/tasks.model';
import { Component, ViewEncapsulation, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * The Users tab of the My Tasks settings (super admin only), like SnapKhata's: the accounts of the site filtered by All / Active / Archived / Deleted,
 * with Edit (name, role and My Tasks access), Archive (cannot log in) / Activate, Delete and Restore per row. The caller's own row has no actions;
 * the API checks the same rights. Giving My Tasks never gives SnapKhata or any other app: only the My Tasks box changes.
 */
@Component({
  selector: 'app-tasks-users',
  imports: [TaskIcon, UserAvatar],
  templateUrl: './tasks-users.html',
  styleUrl: './tasks-users.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TasksUsers {
  protected readonly q = signal('');
  protected readonly busy = signal(0);
  protected readonly editing = signal(0);
  private readonly api = inject(ApiService);
  protected readonly formatDate = formatDate;
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly state = inject(TasksStateService);
  protected readonly status = signal<TaskUserStatus>('all');
  protected readonly access = signal<UserAccess | null>(null);
  protected readonly notice = signal<TaskNotice | null>(null);
  protected readonly statuses: TaskUserStatus[] = ['all', 'active', 'archived', 'deleted'];
  protected readonly statusIcons: Record<TaskUserStatus, string> = { all: 'users', active: 'check', archived: 'lock', deleted: 'trash' };
  /** Active users first, then archived, then deleted ones; each group by name. The search matches the name or the e-mail. */
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const locale = this.i18n.info().locale.replace('_', '-');
    return (this.access()?.users ?? []).filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).sort((a, b) => this.rank(a) - this.rank(b) || a.displayName.localeCompare(b.displayName, locale));
  });

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  toggleEdit(user: AuthUser): void {
    this.editing.set(this.editing() === user.id ? 0 : user.id);
    this.notice.set(null);
  }

  /** True when the user may open My Tasks: given the app, or an administrator (who opens every app). */
  hasTasks(user: AuthUser): boolean {
    return user.isAdmin || user.apps.includes('tasks');
  }

  pick(status: TaskUserStatus): void {
    if (status === this.status())
      return;
    this.status.set(status);
    this.editing.set(0);
    this.access.set(null);
    void this.load();
  }

  async remove(user: AuthUser): Promise<void> {
    if (await this.state.confirm(this.i18n.t('tasks.us.deleteTitle', { name: user.displayName }), this.i18n.t('tasks.us.delete')))
      await this.run(user.id, () => this.api.message('DELETE', `/admin/users/${user.id}`));
  }

  /** Brings a deleted user back; one who was archived before the delete stays archived. */
  async restore(user: AuthUser): Promise<void> {
    await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/restore`));
  }

  async archive(user: AuthUser): Promise<void> {
    if (await this.state.confirm(this.i18n.t('tasks.us.archiveTitle', { name: user.displayName }), this.i18n.t('tasks.us.archive')))
      await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/archive`));
  }

  async activate(user: AuthUser): Promise<void> {
    await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/activate`));
  }

  /** Saves the name, the role and the My Tasks box; the user's other apps stay as they are. */
  async save(user: AuthUser, form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const apps = [...user.apps.filter((a) => a !== 'tasks'), ...(data.get('tasks') === 'on' ? ['tasks'] : [])];
    const body = { roleId: Number(data.get('roleId')), displayName: String(data.get('displayName') ?? '').trim(), apps };
    await this.run(user.id, async () => {
      const res = await this.api.sendFull<AuthUser>('PUT', `/admin/users/${user.id}`, this.api.json(body));
      this.editing.set(0);
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      const status = this.status();
      const access = await this.api.get<UserAccess>(`/admin/users?status=${status}`);
      if (status === this.status())
        this.access.set(access);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private rank(user: AuthUser): number {
    return user.isDeleted ? 2 : user.isArchived ? 1 : 0;
  }

  /** Runs one row's change, shows the server's answer and loads the list again. */
  private async run(userId: number, work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(userId);
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false });
      await this.load();
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(0);
    }
  }

  // #endregion
}
