import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { TestLogin, TestLoginBody, TestLoginNotice } from './test-logins-card.model';

/**
 * Settings > General > Test logins (super admin, password login; the API checks the same): the one-tap logins of the login page, kept in the
 * database instead of the environment files. A password is sent only when typed; the API stores it encrypted, never returns it, and logs in with it itself.
 */
@Component({
  selector: 'app-test-logins-card',
  templateUrl: './test-logins-card.html',
  styleUrl: './test-logins-card.scss',
})

export class TestLoginsCard {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly logins = signal<TestLogin[] | null>(null);
  protected readonly notice = signal<TestLoginNotice | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async remove(login: TestLogin): Promise<void> {
    await this.run(async () => {
      const text = await this.api.message('DELETE', `/admin/test-logins/${login.id}`);
      this.logins.update((list) => (list ?? []).filter((l) => l.id !== login.id));
      return text;
    });
  }

  async add(form: HTMLFormElement): Promise<void> {
    const body = this.body(form, (this.logins()?.length ?? 0) + 1);
    await this.run(async () => {
      const res = await this.api.sendFull<TestLogin>('POST', '/admin/test-logins', this.api.json(body));
      this.logins.update((list) => [...(list ?? []), res.data]);
      form.reset();
      return res.message ?? '';
    });
  }

  async save(login: TestLogin, form: HTMLFormElement): Promise<void> {
    const body = this.body(form, login.sortOrder);
    await this.run(async () => {
      const res = await this.api.sendFull<TestLogin>('PUT', `/admin/test-logins/${login.id}`, this.api.json(body));
      this.logins.update((list) => (list ?? []).map((l) => (l.id === login.id ? res.data : l)));
      const password = form.elements.namedItem('password') as HTMLInputElement | null;
      if (password)
        password.value = '';
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.logins.set(await this.api.get<TestLogin[]>('/admin/test-logins'));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  private async run(work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      this.notice.set({ text: await work(), error: false });
    } catch (e) {
      this.notice.set({ text: (e as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }

  private body(form: HTMLFormElement, sortOrder: number): TestLoginBody {
    const data = new FormData(form);
    return { email: String(data.get('email') ?? '').trim(), password: String(data.get('password') ?? ''), showOnLogin: data.get('showOnLogin') === 'on', sortOrder };
  }

  // #endregion
}
