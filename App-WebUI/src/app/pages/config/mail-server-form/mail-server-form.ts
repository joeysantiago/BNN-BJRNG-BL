import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { ChoiceGroup } from '../../../shared/choice-group';
import { ChoiceOption } from '../../../shared/models/choice.model';
import { MailNotice, MailSecurity, MailServer } from './mail-server-form.model';
import { Component, afterNextRender, computed, inject, input, signal } from '@angular/core';

/** The usual port of each kind of connection, offered when the security choice changes. */
const PORTS: Record<MailSecurity, number> = { starttls: 587, ssl: 465, none: 25 };

/**
 * One mail profile of the site (GET/PUT /admin/mail/{purpose}, super admin with a password login; the API checks the same): the server, its login and the
 * sender. Used for the site's own server ("default", Settings > Keys) and by each app for its own profiles (SnapKhata: "otp", "notification").
 * The password is sent only when typed; the API stores it encrypted and never returns it.
 */
@Component({
  selector: 'app-mail-server-form',
  imports: [ChoiceGroup],
  templateUrl: './mail-server-form.html',
  styleUrl: './mail-server-form.scss',
})

export class MailServerForm {
  readonly lead = input('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  readonly heading = input.required<string>();
  readonly purpose = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly notice = signal<MailNotice | null>(null);
  protected readonly server = signal<MailServer | null>(null);
  protected readonly securities: MailSecurity[] = ['starttls', 'ssl', 'none'];

  protected readonly securityOptions = computed<ChoiceOption[]>(() => this.securities.map((m) => ({ value: m, label: this.i18n.t('gen.sec.' + m) })));

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(): Promise<void> {
    await this.run(() => this.api.message('POST', `/admin/mail/${this.purpose()}/test`));
  }

  async save(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    const body = { enabled: data.get('enabled') === 'on', host: text('host'), port: Number(text('port')), security: text('security'), userName: text('userName'), password: String(data.get('password') ?? ''), fromName: text('fromName'), fromAddress: text('fromAddress') };
    await this.run(async () => {
      const res = await this.api.sendFull<MailServer>('PUT', `/admin/mail/${this.purpose()}`, this.api.json(body));
      this.server.set(res.data);
      // The typed password is not kept on the page; the form now says one is saved.
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
      this.server.set((await this.api.get<MailServer[]>('/admin/mail')).find((s) => s.purpose === this.purpose()) ?? null);
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
