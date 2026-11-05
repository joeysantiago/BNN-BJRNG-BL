import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { QuickLoginNotice, QuickLoginUser } from './quick-logins-card.model';

/**
 * Settings > General > Quick logins (super admin, password login; the API checks the same): the users shown as one-tap logins on the login page.
 * It is a switch on the user's own account (Users.ShowOnLogin), not a second copy of a password: a tap logs in as that user on the server.
 */
@Component({
  selector: 'app-quick-logins-card',
  templateUrl: './quick-logins-card.html',
  styleUrl: './quick-logins-card.scss',
})

export class QuickLoginsCard {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly users = signal<QuickLoginUser[] | null>(null);
  protected readonly notice = signal<QuickLoginNotice | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async add(form: HTMLFormElement): Promise<void> {
    const email = String(new FormData(form).get('email') ?? '').trim();
    await this.run(email, true, () => form.reset());
  }

  async remove(user: QuickLoginUser): Promise<void> {
    await this.run(user.email, false);
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.users.set(await this.api.get<QuickLoginUser[]>('/admin/users/quick-logins'));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  /** Switches the user on or off and reloads the list, which the server keeps in its own order. */
  private async run(email: string, showOnLogin: boolean, after?: () => void): Promise<void> {
    if (this.busy() || !email)
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      const text = await this.api.message('PUT', '/admin/users/quick-logins', this.api.json({ email, showOnLogin }));
      this.users.set(await this.api.get<QuickLoginUser[]>('/admin/users/quick-logins'));
      after?.();
      this.notice.set({ text, error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
