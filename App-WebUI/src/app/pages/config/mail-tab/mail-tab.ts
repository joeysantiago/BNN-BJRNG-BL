import { PanelNotice } from '../config.model';
import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { MailPurpose, MailSecurity, MailSetting } from '../../../core/models/mail.model';

/** The usual port of each kind of connection, offered when the security choice changes. */
const PORTS: Record<MailSecurity, number> = { starttls: 587, ssl: 465, none: 25 };

/**
 * The Mail tab of the Settings page (super admin only): the mail server that sends the one-time sign-in codes and the one that sends the notifications,
 * each with host, port, security, login and sender. A server that is off leaves its mail on the site's configured server. The password is sent only when
 * typed and never comes back. Mojito has no mail server: its demo backend checks the settings but sends nothing, and says so.
 */
@Component({
  selector: 'app-mail-tab',
  templateUrl: './mail-tab.html',
  styleUrl: './mail-tab.scss',
})

export class MailTab {
  protected readonly error = signal('');
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly busy = signal<MailPurpose | ''>('');
  protected readonly settings = signal<MailSetting[] | null>(null);
  protected readonly securities: MailSecurity[] = ['starttls', 'ssl', 'none'];
  protected readonly notices = signal<Partial<Record<MailPurpose, PanelNotice>>>({});

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  lead(purpose: MailPurpose): string {
    return this.i18n.t(`ml.${purpose}.lead`);
  }

  heading(purpose: MailPurpose): string {
    return this.i18n.t(`ml.${purpose}.h`);
  }

  securityName(security: MailSecurity): string {
    return this.i18n.t(`ml.sec.${security}`);
  }

  async test(purpose: MailPurpose): Promise<void> {
    await this.run(purpose, () => this.api.message('POST', `/admin/mail/${purpose}/test`));
  }

  async save(ev: Event, purpose: MailPurpose): Promise<void> {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const data = new FormData(form);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    const body = { enabled: data.get('enabled') === 'on', host: text('host'), port: Number(text('port')), security: text('security'), userName: text('userName'), password: String(data.get('password') ?? ''), fromName: text('fromName'), fromAddress: text('fromAddress') };
    await this.run(purpose, async () => {
      const res = await this.api.sendFull<MailSetting>('PUT', `/admin/mail/${purpose}`, this.api.json(body));
      this.settings.update((all) => (all ?? []).map((s) => (s.purpose === purpose ? res.data : s)));
      // The typed password is not kept on the page; the card now says one is saved.
      const password = form.elements.namedItem('password') as HTMLInputElement | null;
      if (password)
        password.value = '';
      return res.message ?? '';
    });
  }

  /** Moves the port to the usual one of the new security choice, unless a custom port was typed. */
  suggestPort(form: HTMLFormElement, security: MailSecurity): void {
    const port = form.elements.namedItem('port') as HTMLInputElement | null;
    if (port && (!port.value || Object.values(PORTS).includes(Number(port.value))))
      port.value = String(PORTS[security]);
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.settings.set(await this.api.get<MailSetting[]>('/admin/mail'));
    } catch (e) {
      this.error.set(this.failureText(e));
    }
  }

  /** The backend's own message when it answered; "server unreachable" when it did not. */
  private failureText(e: unknown): string {
    return (e as { status?: number }).status !== undefined ? (e as Error).message : this.i18n.t('auth.serverDown');
  }

  /** One card's action: shows the backend's answer (or its refusal) on that card only. */
  private async run(purpose: MailPurpose, work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(purpose);
    this.notices.update((n) => ({ ...n, [purpose]: undefined }));
    try {
      const text = await work();
      this.notices.update((n) => ({ ...n, [purpose]: { text, error: false } }));
    } catch (e) {
      this.notices.update((n) => ({ ...n, [purpose]: { text: this.failureText(e), error: true } }));
    } finally {
      this.busy.set('');
    }
  }

  // #endregion
}
