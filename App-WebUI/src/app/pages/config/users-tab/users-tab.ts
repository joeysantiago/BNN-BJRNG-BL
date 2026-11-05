import { appLink } from '../../../core/apps';
import { ApiService } from '../../../core/api.service';
import { FEATURE_APPS } from '../../../feature-routes';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { UserNotice, UserStatus } from '../config.model';
import { RoleInfo } from '../../../core/models/role.model';
import { AuthUser, UserAccess } from '../../../core/models/auth.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';

/** The id of the Add user form in the busy and notice signals (users have ids from 1). */
const NEW = 0;

/**
 * The Users tab of the Settings page: add a user with a role from the dropdown (roles come from the database), change a user's name, role and apps, delete a user.
 * The list is filtered by All / Active / Archived / Deleted (each fetched from GET /admin/users?status=) and searched by name or e-mail; an archived user cannot log in
 * until activated, and a deleted one can be restored. Archive and Delete ask again on the same row.
 * Each button shows only with that right of the caller's role. Only a super admin can add, change or delete a super admin or give the super admin role;
 * for everyone else those rows are read-only and that role is not in the dropdown. The API checks every rule again.
 */
@Component({
  selector: 'app-users-tab',
  imports: [UserAvatar],
  templateUrl: './users-tab.html',
  styleUrl: './users-tab.scss',
})

export class UsersTab {
  protected readonly NEW = NEW;
  protected readonly q = signal('');
  protected readonly error = signal('');
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly busy = signal<number | null>(null);
  protected readonly status = signal<UserStatus>('all');
  /** The user whose row is open for editing. */
  protected readonly editing = signal<number | null>(null);
  /** The user whose Archive button was pressed once and now asks again. */
  protected readonly archiving = signal<number | null>(null);
  protected readonly access = signal<UserAccess | null>(null);
  protected readonly confirming = signal<number | null>(null);
  protected readonly notice = signal<UserNotice | null>(null);
  protected readonly canAdd = computed(() => this.auth.can('settings.users', 'add'));
  protected readonly canEdit = computed(() => this.auth.can('settings.users', 'edit'));
  protected readonly statuses: UserStatus[] = ['all', 'active', 'archived', 'deleted'];
  protected readonly canDelete = computed(() => this.auth.can('settings.users', 'delete'));
  /** Only this branch's apps: a Creta build shows no access boxes for the other apps (their access is kept on save). */
  protected readonly apps = computed(() => (this.access()?.apps ?? []).filter((a) => FEATURE_APPS.includes(a.code)));
  protected readonly defaultRole = computed(() => this.roles().find((r) => r.isDefault)?.id ?? this.roles()[0]?.id ?? 0);
  protected readonly autoApps = computed(() => this.apps().filter((a) => a.autoGrant).map((a) => this.appName(a.code)).join(', '));
  /** The roles the caller may give: a super admin every role, everyone else every role but super admin. */
  protected readonly roles = computed(() => (this.access()?.roles ?? []).filter((r) => this.auth.isSuperAdmin() || r.code !== 'super-admin'));
  /** Active users first, then archived, then deleted ones (on the All list); each group by name. The search matches the name or the e-mail. */
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const locale = this.i18n.info().locale.replace('_', '-');
    return (this.access()?.users ?? []).filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).sort((a, b) => this.rank(a) - this.rank(b) || a.displayName.localeCompare(b.displayName, locale));
  });

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  toggleEdit(id: number): void {
    this.notice.set(null);
    this.editing.update((e) => (e === id ? null : id));
  }

  appName(code: string): string {
    return this.i18n.t(appLink(code).name);
  }

  /** Shows another list; only that list is fetched. */
  pick(status: UserStatus): void {
    if (status === this.status())
      return;
    this.status.set(status);
    this.editing.set(null);
    this.access.set(null);
    void this.load();
  }

  /** A super admin's row, for a caller who is not a super admin: shown, but not changeable. */
  locked(user: AuthUser): boolean {
    return user.roleCode === 'super-admin' && !this.auth.isSuperAdmin();
  }

  roleName(role: RoleInfo): string {
    return role.isDefault ? this.i18n.t('usr.role.default', { name: role.name }) : role.name;
  }

  /** The apps of this branch the user may open, as tags in the row. */
  appTags(user: AuthUser): string[] {
    return user.apps.filter((c) => FEATURE_APPS.includes(c)).map((c) => this.appName(c));
  }

  /** Adds a user with the chosen role. The form is read before its fields are disabled (disabled fields are not sent). */
  async create(ev: Event): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const body = { email: String(data.get('email') ?? '').trim(), displayName: String(data.get('displayName') ?? '').trim(), password: String(data.get('password') ?? ''), roleId: Number(data.get('roleId')), apps: data.getAll('app').map(String) };
    await this.run(NEW, async () => {
      const res = await this.api.sendFull<AuthUser>('POST', '/admin/users', this.api.json(body));
      this.access.update((a) => (a ? { ...a, users: [...a.users, res.data].sort((x, y) => x.email.localeCompare(y.email)) } : a));
      form.reset();
      return res.message ?? '';
    });
  }

  noticeFor(id: number): UserNotice | null {
    const n = this.notice();
    return n?.id === id ? n : null;
  }

  /** First press asks again on the same row; the second deletes the user (and logs them out everywhere). */
  async remove(user: AuthUser): Promise<void> {
    if (this.confirming() !== user.id) {
      this.confirming.set(user.id);
      return;
    }
    this.confirming.set(null);
    await this.run(user.id, async () => {
      const text = await this.api.message('DELETE', `/admin/users/${user.id}`);
      this.access.update((a) => (a ? { ...a, users: a.users.filter((u) => u.id !== user.id) } : a));
      return text;
    });
  }

  async restore(user: AuthUser): Promise<void> {
    await this.change(user, 'restore');
  }

  /** First press asks again on the same row; the second archives the user, who is logged out at once and cannot log in until activated. */
  async archive(user: AuthUser): Promise<void> {
    if (this.archiving() !== user.id) {
      this.archiving.set(user.id);
      return;
    }
    this.archiving.set(null);
    await this.change(user, 'archive');
  }

  async activate(user: AuthUser): Promise<void> {
    await this.change(user, 'activate');
  }

  /** Saves one user's name, role and app boxes. Apps this branch does not show keep their access. */
  async save(ev: Event, user: AuthUser): Promise<void> {
    ev.preventDefault();
    const data = new FormData(ev.target as HTMLFormElement);
    const body = { displayName: String(data.get('displayName') ?? '').trim(), roleId: Number(data.get('roleId')), apps: [...data.getAll('app').map(String), ...user.apps.filter((c) => !FEATURE_APPS.includes(c))] };
    await this.run(user.id, async () => {
      const res = await this.api.sendFull<AuthUser>('PUT', `/admin/users/${user.id}`, this.api.json(body));
      this.access.update((a) => (a ? { ...a, users: a.users.map((u) => (u.id === user.id ? res.data : u)) } : a));
      this.editing.set(null);
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      const status = this.status();
      const access = await this.api.get<UserAccess>(`/admin/users?status=${status}`);
      // A slower answer for a list the reader already left is dropped.
      if (status === this.status())
        this.access.set(access);
    } catch (e) {
      this.error.set(this.failureText(e));
    }
  }

  private rank(user: AuthUser): number {
    return user.isDeleted ? 2 : user.isArchived ? 1 : 0;
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  private async run(id: number, work: () => Promise<string>): Promise<void> {
    if (this.busy() !== null)
      return;
    this.busy.set(id);
    this.notice.set(null);
    try {
      this.notice.set({ id, text: await work(), error: false });
    } catch (e) {
      this.notice.set({ id, text: this.failureText(e), error: true });
    } finally {
      this.busy.set(null);
    }
  }

  /** Archives, activates or restores one user, then reloads the list (the user may move to another list). */
  private async change(user: AuthUser, action: 'archive' | 'activate' | 'restore'): Promise<void> {
    await this.run(user.id, async () => {
      const text = await this.api.message('PUT', `/admin/users/${user.id}/${action}`);
      await this.load();
      return text;
    });
  }

  // #endregion
}
