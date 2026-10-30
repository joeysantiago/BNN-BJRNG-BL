import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { KhataApiService } from '../../../core/khata-api.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KhataPinPromptService } from '../../../core/khata-pin-prompt.service';
import { Component, afterNextRender, effect, inject, signal } from '@angular/core';
import { KHATA_PIN_PURPOSE, KhataContact, KhataContactType } from '../../../core/models/khata.model';

/** Contact details, the "can add entries" switch (turning it on needs the PIN) and "Delete contact" (PIN). */
@Component({
  selector: 'app-khata-contact-settings',
  imports: [RouterLink],
  templateUrl: './khata-contact-settings.html',
  styleUrl: './khata-contact-settings.scss',
})

export class KhataContactSettings {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly prompt = inject(KhataPinPromptService);
  protected readonly contact = signal<KhataContact | null>(null);
  protected readonly bookId = Number(this.route.snapshot.paramMap.get('bookId'));
  protected readonly contactId = Number(this.route.snapshot.paramMap.get('contactId'));

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('khata.cs.title'), description: this.i18n.t('seo.khata.desc'), path: '/khata/', image: 'default', lang: this.i18n.lang(), noindex: true }));
    afterNextRender(() => void this.load());
  }

  // #region Public Methods

  async remove(): Promise<void> {
    const contact = this.contact();
    const proof = contact && (await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.DeleteContact, targetId: contact.id, title: this.i18n.t('khata.cs.deleteTitle', { name: contact.name }) }));
    if (!contact || !proof)
      return;
    await this.run(async () => {
      await this.api.deleteContact(contact.id, proof);
      void this.router.navigate(['/khata/app/b', this.bookId], { replaceUrl: true });
    });
  }

  /** Turning the switch on asks for the PIN; when that is cancelled or fails, the box goes back to off. */
  async toggle(box: HTMLInputElement): Promise<void> {
    const contact = this.contact();
    const allow = box.checked;
    if (!contact)
      return;
    const proof = allow ? await this.prompt.ask({ purpose: KHATA_PIN_PURPOSE.AllowContactEntries, targetId: contact.id, title: this.i18n.t('khata.cs.allowTitle', { name: contact.name }) }) : undefined;
    if (allow && !proof) {
      box.checked = false;
      return;
    }
    await this.run(async () => this.contact.set(await this.api.setPermission(contact.id, allow, proof ?? undefined)));
    box.checked = this.contact()?.allowContactEntries ?? false;
  }

  async save(name: string, mobile: string, email: string, address: string, note: string, type: string): Promise<void> {
    const contact = this.contact();
    if (!contact)
      return;
    const request = { name, mobile: mobile || undefined, email: email || undefined, address: address || undefined, note: note || undefined, contactType: Number(type) as KhataContactType, rowVersion: contact.rowVersion };
    await this.run(async () => {
      this.contact.set(await this.api.updateContact(contact.id, request));
      this.info.set(this.i18n.t('khata.cs.saved'));
    });
  }

  // #endregion

  // #region Private Methods

  private async load(): Promise<void> {
    await this.run(async () => this.contact.set((await this.api.contacts(this.bookId)).contacts.find((c) => c.id === this.contactId) ?? null));
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.info.set('');
    try {
      await work();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
