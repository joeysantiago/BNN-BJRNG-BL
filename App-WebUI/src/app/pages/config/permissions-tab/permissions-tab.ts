import { UserNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { TranslationKey } from '../../../core/models/i18n.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { PageCode, PageInfo, RightFlags, RoleInfo, RolePermission, RolePermissionList } from '../../../core/models/role.model';

/** The id of the Add page form in the busy and notice signals (rows have ids from 1). */
const NEW = 0;

/**
 * The Role rights tab of the Settings page: pick a role, then give it pages (Settings tabs) with View, Add, Edit and Delete rights, change them or take a page away.
 * Add and Delete show only on pages where they mean something; any right includes View. A super admin has every right whatever the rows say, and only a super admin
 * changes the super admin role's rows. The API checks every rule again; the role's users get a change at once.
 */
@Component({
  selector: 'app-permissions-tab',
  templateUrl: './permissions-tab.html',
  styleUrl: './permissions-tab.scss',
})

export class PermissionsTab {
  protected readonly NEW = NEW;
  protected readonly error = signal('');
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly busy = signal<number | null>(null);
  protected readonly roleId = signal<number | null>(null);
  protected readonly roles = signal<RoleInfo[] | null>(null);
  protected readonly confirming = signal<number | null>(null);
  protected readonly notice = signal<UserNotice | null>(null);
  protected readonly list = signal<RolePermissionList | null>(null);
  protected readonly canAdd = computed(() => this.auth.can('settings.permissions', 'add'));
  protected readonly canEdit = computed(() => this.auth.can('settings.permissions', 'edit'));
  protected readonly canDelete = computed(() => this.auth.can('settings.permissions', 'delete'));
  protected readonly role = computed(() => this.roles()?.find((r) => r.id === this.roleId()) ?? null);
  /** The super admin role, for a caller who is not a super admin: shown, but not changeable. */
  protected readonly locked = computed(() => this.role()?.code === 'super-admin' && !this.auth.isSuperAdmin());
  /** Pages the role was not given yet: the choices of the Add page form. */
  protected readonly free = computed(() => (this.list()?.pages ?? []).filter((p) => !(this.list()?.permissions ?? []).some((r) => r.pageId === p.id)));

  constructor() {
    // 0 = the first role.
    afterNextRender(() => void this.loadRights(0));
  }

  // #region Public Methods

  pick(ev: Event): void {
    void this.loadRights(Number((ev.target as HTMLSelectElement).value));
  }

  pageName(code: PageCode): string {
    return this.i18n.t(`perm.page.${code}` as TranslationKey);
  }

  /** Gives the chosen role a page with the ticked rights. */
  async create(ev: Event): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const body = { roleId: this.roleId(), pageId: Number(data.get('pageId')), ...this.flags(data) };
    await this.run(NEW, async () => {
      const res = await this.api.sendFull<RolePermission>('POST', '/admin/role-permissions', this.api.json(body));
      this.list.update((l) => (l ? { ...l, permissions: this.ordered(l, [...l.permissions, res.data]) } : l));
      form.reset();
      return res.message ?? '';
    });
  }

  noticeFor(id: number): UserNotice | null {
    const n = this.notice();
    return n?.id === id ? n : null;
  }

  page(row: RolePermission): PageInfo | null {
    return this.list()?.pages.find((p) => p.id === row.pageId) ?? null;
  }

  /** First press asks again on the same row; the second takes the page away from the role. */
  async remove(row: RolePermission): Promise<void> {
    if (this.confirming() !== row.id) {
      this.confirming.set(row.id);
      return;
    }
    this.confirming.set(null);
    await this.run(row.id, async () => {
      const text = await this.api.message('DELETE', `/admin/role-permissions/${row.id}`);
      this.list.update((l) => (l ? { ...l, permissions: l.permissions.filter((r) => r.id !== row.id) } : l));
      return text;
    });
  }

  async save(ev: Event, row: RolePermission): Promise<void> {
    ev.preventDefault();
    const body = { roleId: row.roleId, pageId: row.pageId, ...this.flags(new FormData(ev.target as HTMLFormElement)) };
    await this.run(row.id, async () => {
      const res = await this.api.sendFull<RolePermission>('PUT', `/admin/role-permissions/${row.id}`, this.api.json(body));
      this.list.update((l) => (l ? { ...l, permissions: l.permissions.map((r) => (r.id === row.id ? res.data : r)) } : l));
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  private flags(data: FormData): RightFlags {
    return { canView: data.get('canView') !== null, canAdd: data.get('canAdd') !== null, canEdit: data.get('canEdit') !== null, canDelete: data.get('canDelete') !== null };
  }

  private async loadRights(roleId: number): Promise<void> {
    this.roleId.set(roleId);
    this.list.set(null);
    this.notice.set(null);
    this.confirming.set(null);
    try {
      const list = await this.api.get<RolePermissionList>(`/admin/role-permissions?roleId=${roleId}`);
      this.roles.set(list.roles);
      this.roleId.set(list.roleId);
      this.list.set(list);
    } catch (e) {
      this.error.set(this.failureText(e));
    }
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

  /** Rows in the order of the pages, like the API sends them. */
  private ordered(list: RolePermissionList, rows: RolePermission[]): RolePermission[] {
    return [...rows].sort((a, b) => list.pages.findIndex((p) => p.id === a.pageId) - list.pages.findIndex((p) => p.id === b.pageId));
  }

  // #endregion
}
