import { KhataDatePipe } from '../../ui/khata-date.pipe';
import { ApiService } from '../../../../core/api.service';
import { KhataIcon } from '../../ui/khata-icon/khata-icon';
import { AuthService } from '../../../../core/auth.service';
import { I18nService } from '../../../../core/i18n.service';
import { UserAvatar } from '../../../../shared/user-avatar';
import { KhataUiService } from '../../../../core/khata-ui.service';
import { AuthUser, UserAccess } from '../../../../core/models/auth.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { KhataIconName, KhataNotice, KhataUserStatus } from '../../../../core/models/khata.model';

/**
 * The Users tab of SnapKhata's settings (super admin only): the accounts of the site, filtered by All / Active / Archived / Deleted (each fetched on its own
 * from GET /admin/users?status=), with Edit (name and role), Archive / Activate and Delete per row.
 * An archived user cannot log in until activated; a deleted one is gone for good and has no actions. The caller's own row has none either; the API checks the same.
 */
@Component({
  selector: 'app-khata-users',
  imports: [KhataIcon, UserAvatar, KhataDatePipe],
  templateUrl: './khata-users.html',
})

export class KhataUsers {
  protected readonly q = signal('');
  /** The user whose row is saving, so only that row shows as busy. */
  protected readonly busy = signal(0);
  protected readonly editing = signal(0);
  private readonly api = inject(ApiService);
  private readonly ui = inject(KhataUiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly status = signal<KhataUserStatus>('all');
  protected readonly access = signal<UserAccess | null>(null);
  protected readonly notice = signal<KhataNotice | null>(null);
  protected readonly statuses: KhataUserStatus[] = ['all', 'active', 'archived', 'deleted'];
  protected readonly statusIcons: Record<KhataUserStatus, KhataIconName> = { all: 'users', active: 'check', archived: 'lock', deleted: 'trash' };
  /** Active users first, then archived, then deleted ones (on the All list); each group by name. The search matches the name or the e-mail. */
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const locale = this.i18n.info().locale.replace('_', '-');
    return (this.access()?.users ?? [])
      .filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => this.rank(a) - this.rank(b) || a.displayName.localeCompare(b.displayName, locale));
  });

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  toggleEdit(user: AuthUser): void {
    this.editing.set(this.editing() === user.id ? 0 : user.id);
    this.notice.set(null);
  }

  /** Shows another list; only that list is fetched. */
  pick(status: KhataUserStatus): void {
    if (status === this.status())
      return;
    this.status.set(status);
    this.editing.set(0);
    this.access.set(null);
    void this.load();
  }

  async remove(user: AuthUser): Promise<void> {
    if (await this.ui.confirm(this.i18n.t('khata.us.deleteTitle', { name: user.displayName })))
      await this.run(user.id, () => this.api.message('DELETE', `/admin/users/${user.id}`));
  }

  async archive(user: AuthUser): Promise<void> {
    if (await this.ui.confirm(this.i18n.t('khata.us.archiveTitle', { name: user.displayName })))
      await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/archive`));
  }

  /** Brings a deleted user back; one who was archived before the delete stays archived. */
  async restore(user: AuthUser): Promise<void> {
    await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/restore`));
  }

  async activate(user: AuthUser): Promise<void> {
    await this.run(user.id, () => this.api.message('PUT', `/admin/users/${user.id}/activate`));
  }

  /** Saves the name and role; the user's app access stays as it is. */
  async save(user: AuthUser, form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const body = { roleId: Number(data.get('roleId')), displayName: String(data.get('displayName') ?? '').trim(), apps: user.apps };
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
      // A slower answer for a list the reader already left is dropped.
      if (status === this.status())
        this.access.set(access);
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    }
  }

  private rank(user: AuthUser): number {
    return user.isDeleted ? 2 : user.isArchived ? 1 : 0;
  }

  /** Runs one row's change, shows the server's answer and reloads the list. */
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
