import { UserNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { RoleForm, RoleInfo } from '../../../core/models/role.model';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';

/** The id of the Add role form in the busy and notice signals (roles have ids from 1). */
const NEW = 0;

/**
 * The Roles tab of the Settings page: add, change and delete roles (the Roles table). Built-in roles keep their code and cannot be deleted, a role users still have
 * cannot be deleted, and one role is the sign-up role (every self sign-up gets it). Only a super admin can change the super admin role. The API checks every rule again.
 */
@Component({
  selector: 'app-roles-tab',
  templateUrl: './roles-tab.html',
  styleUrl: './roles-tab.scss',
})

export class RolesTab {
  protected readonly NEW = NEW;
  protected readonly error = signal('');
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly busy = signal<number | null>(null);
  protected readonly roles = signal<RoleInfo[] | null>(null);
  protected readonly confirming = signal<number | null>(null);
  protected readonly notice = signal<UserNotice | null>(null);
  protected readonly canAdd = computed(() => this.auth.can('settings.roles', 'add'));
  protected readonly canEdit = computed(() => this.auth.can('settings.roles', 'edit'));
  protected readonly canDelete = computed(() => this.auth.can('settings.roles', 'delete'));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  /** The super admin role, for a caller who is not a super admin: shown, but not changeable. */
  locked(role: RoleInfo): boolean {
    return role.code === 'super-admin' && !this.auth.isSuperAdmin();
  }

  async create(ev: Event): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const body = this.read(form);
    await this.run(NEW, async () => {
      const res = await this.api.sendFull<RoleInfo>('POST', '/admin/roles', this.api.json(body));
      await this.load();
      form.reset();
      return res.message ?? '';
    });
  }

  noticeFor(id: number): UserNotice | null {
    const n = this.notice();
    return n?.id === id ? n : null;
  }

  /** First press asks again on the same row; the second deletes the role (only a custom role nobody has). */
  async remove(role: RoleInfo): Promise<void> {
    if (this.confirming() !== role.id) {
      this.confirming.set(role.id);
      return;
    }
    this.confirming.set(null);
    await this.run(role.id, async () => {
      const text = await this.api.message('DELETE', `/admin/roles/${role.id}`);
      this.roles.update((list) => (list ?? []).filter((r) => r.id !== role.id));
      return text;
    });
  }

  async save(ev: Event, role: RoleInfo): Promise<void> {
    ev.preventDefault();
    const body = this.read(ev.target as HTMLFormElement, role);
    await this.run(role.id, async () => {
      const res = await this.api.sendFull<RoleInfo>('PUT', `/admin/roles/${role.id}`, this.api.json(body));
      // Making a role the sign-up role takes the mark from the others, so the whole list is read again.
      await this.load();
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.roles.set(await this.api.get<RoleInfo[]>('/admin/roles'));
    } catch (e) {
      this.error.set(this.failureText(e));
    }
  }

  /** The server's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  /** The form's values, read before its fields are disabled. A built-in role sends its own code (the field is read-only). */
  private read(form: HTMLFormElement, role?: RoleInfo): RoleForm {
    const data = new FormData(form);
    return { code: role?.isSystem ? role.code : String(data.get('code') ?? '').trim(), name: String(data.get('name') ?? '').trim(), description: String(data.get('description') ?? '').trim(), sortOrder: Number(data.get('sortOrder') ?? 0) || 0, isDefault: data.get('isDefault') !== null };
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

  // #endregion
}
