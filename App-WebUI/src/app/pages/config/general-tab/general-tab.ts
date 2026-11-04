import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { GeneralNotice, MailSecurity, MailServer } from './general-tab.model';

const PURPOSE = 'default';
/** The usual port of each kind of connection, offered when the security choice changes. */
const PORTS: Record<MailSecurity, number> = { starttls: 587, ssl: 465, none: 25 };

/**
 * The General tab of the Settings page (super admin, password login; the API checks the same): the site's settings that hold a login, key or
 * password, which are never kept in the configuration files. Now the site's mail server (the "default" mail profile): it sends every e-mail whose
 * own profile in the Mail tab is off. The password is sent only when typed and never comes back. Mojito has no mail server: its demo backend checks the
 * settings and keeps only whether a password was given, never the password itself (the API branches store it encrypted in the database).
 */
@Component({
  selector: 'app-general-tab',
  templateUrl: './general-tab.html',
  styleUrl: './general-tab.scss',
})

export class GeneralTab {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly server = signal<MailServer | null>(null);
  protected readonly notice = signal<GeneralNotice | null>(null);
  protected readonly securities: MailSecurity[] = ['starttls', 'ssl', 'none'];

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(): Promise<void> {
    await this.run(() => this.api.message('POST', `/admin/mail/${PURPOSE}/test`));
  }

  /** Moves the port to the usual one of the new security choice, unless a custom port was typed. */
  suggestPort(form: HTMLFormElement, security: MailSecurity): void {
    const port = form.elements.namedItem('port') as HTMLInputElement | null;
    if (port && (!port.value || Object.values(PORTS).includes(Number(port.value))))
      port.value = String(PORTS[security]);
  }

  async save(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    const body = { enabled: data.get('enabled') === 'on', host: text('host'), port: Number(text('port')), security: text('security'), userName: text('userName'), password: String(data.get('password') ?? ''), fromName: text('fromName'), fromAddress: text('fromAddress') };
    await this.run(async () => {
      const res = await this.api.sendFull<MailServer>('PUT', `/admin/mail/${PURPOSE}`, this.api.json(body));
      this.server.set(res.data);
      // The typed password is not kept on the page; the form now says one is saved.
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
      this.server.set((await this.api.get<MailServer[]>('/admin/mail')).find((s) => s.purpose === PURPOSE) ?? null);
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

  // #endregion
}
