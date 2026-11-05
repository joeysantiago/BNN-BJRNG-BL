import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { WhatsAppAccount, WhatsAppNotice } from './whatsapp-card.model';
import { Component, afterNextRender, inject, signal } from '@angular/core';

/**
 * Settings > General > WhatsApp (super admin, password login; the API checks the same): the Meta WhatsApp Cloud API account every app sends
 * WhatsApp messages with (My Tasks reminders, SnapKhata notifications). The access token is sent only when typed; the API stores it encrypted and never returns it.
 */
@Component({
  selector: 'app-whatsapp-card',
  templateUrl: './whatsapp-card.html',
  styleUrl: './whatsapp-card.scss',
})

export class WhatsAppCard {
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);
  protected readonly notice = signal<WhatsAppNotice | null>(null);
  protected readonly account = signal<WhatsAppAccount | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async test(to: string): Promise<void> {
    await this.run(() => this.api.message('POST', '/admin/whatsapp/test', this.api.json({ to: to.trim() })));
  }

  async save(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const text = (name: string): string => String(data.get(name) ?? '').trim();
    const body = { enabled: data.get('enabled') === 'on', phoneNumberId: text('phoneNumberId'), businessAccountId: text('businessAccountId') || null, accessToken: String(data.get('accessToken') ?? ''), apiVersion: text('apiVersion'), templateName: text('templateName'), templateLanguage: text('templateLanguage') };
    await this.run(async () => {
      const res = await this.api.sendFull<WhatsAppAccount>('PUT', '/admin/whatsapp', this.api.json(body));
      this.account.set(res.data);
      const token = form.elements.namedItem('accessToken') as HTMLInputElement | null;
      if (token)
        token.value = '';
      return res.message ?? '';
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    try {
      this.account.set(await this.api.get<WhatsAppAccount>('/admin/whatsapp'));
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
