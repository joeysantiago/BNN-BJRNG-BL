import { ApiService } from '../../../../core/api.service';
import { KhataIcon } from '../../ui/khata-icon/khata-icon';
import { I18nService } from '../../../../core/i18n.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { KhataIconName, KhataMailPurpose, KhataMailSecurity, KhataMailSetting, KhataNotice } from '../../../../core/models/khata.model';

/** The usual port of each kind of connection, offered when the security choice changes. */
const PORTS: Record<KhataMailSecurity, number> = { starttls: 587, ssl: 465, none: 25 };

/**
 * The Mail tab of SnapKhata's settings (super admin, password login): the mail server that sends the one-time sign-in codes and the one that sends
 * the notifications, each with host, port, security, login and sender. A server that is off leaves its mail on the site's configured server.
 * The password is sent only when typed; the API keeps it encrypted and never returns it. "Send test e-mail" mails the super admin's own address.
 */
@Component({
  selector: 'app-khata-mail',
  imports: [KhataIcon],
  templateUrl: './khata-mail.html',
})

export class KhataMail {
  protected readonly error = signal('');
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly busy = signal<KhataMailPurpose | ''>('');
  protected readonly settings = signal<KhataMailSetting[] | null>(null);
  protected readonly securities: KhataMailSecurity[] = ['starttls', 'ssl', 'none'];
  protected readonly notices = signal<Partial<Record<KhataMailPurpose, KhataNotice>>>({});
  protected readonly icons: Record<KhataMailPurpose, KhataIconName> = { otp: 'shield', notification: 'mail' };

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(purpose: KhataMailPurpose): Promise<void> {
    await this.run(purpose, () => this.api.message('POST', `/admin/mail/${purpose}/test`));
  }

  /** Moves the port to the usual one of the new security choice, unless a custom port was typed. */
  suggestPort(form: HTMLFormElement, security: KhataMailSecurity): void {
    const port = form.elements.namedItem('port') as HTMLInputElement | null;
    if (port && (!port.value || Object.values(PORTS).includes(Number(port.value))))
      port.value = String(PORTS[security]);
  }

  async save(purpose: KhataMailPurpose, form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    const body = { enabled: data.get('enabled') === 'on', host: text('host'), port: Number(text('port')), security: text('security'), userName: text('userName'), password: String(data.get('password') ?? ''), fromName: text('fromName'), fromAddress: text('fromAddress') };
    await this.run(purpose, async () => {
      const res = await this.api.sendFull<KhataMailSetting>('PUT', `/admin/mail/${purpose}`, this.api.json(body));
      this.settings.update((all) => (all ?? []).map((s) => (s.purpose === purpose ? res.data : s)));
      // The typed password is not kept on the page; the card now says one is saved.
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
      // The site's default server is edited in Settings > General; this tab holds SnapKhata's own two.
      this.settings.set((await this.api.get<KhataMailSetting[]>('/admin/mail')).filter((s) => s.purpose in this.icons));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  /** One card's action: shows the server's answer (or its refusal) on that card only. */
  private async run(purpose: KhataMailPurpose, work: () => Promise<string>): Promise<void> {
    if (this.busy())
      return;
    this.busy.set(purpose);
    this.notices.update((n) => ({ ...n, [purpose]: undefined }));
    try {
      const text = await work();
      this.notices.update((n) => ({ ...n, [purpose]: { text, error: false } }));
    } catch (e) {
      this.notices.update((n) => ({ ...n, [purpose]: { text: (e as Error).message, error: true } }));
    } finally {
      this.busy.set('');
    }
  }

  // #endregion
}
