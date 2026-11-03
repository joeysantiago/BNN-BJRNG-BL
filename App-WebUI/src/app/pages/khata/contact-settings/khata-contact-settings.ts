import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { I18nService } from '../../../core/i18n.service';
import { contactErrors } from '../../../core/khata-format';
import { KhataAvatar } from '../ui/khata-avatar/khata-avatar';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataMissing } from '../ui/khata-missing/khata-missing';
import { KhataApiService } from '../../../core/khata-api.service';
import { KhataSkeleton } from '../ui/khata-skeleton/khata-skeleton';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KhataStateService } from '../../../core/khata-state.service';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { KHATA_CUSTOMER, KHATA_SUPPLIER, KhataContact, KhataContactType, KhataNotify } from '../../../core/models/khata.model';

/** /khata/app/b/:bookId/contact/:contactId/settings: a party's details, the "can add entries" switch and "Delete contact" (both ask to confirm). */
@Component({
  selector: 'app-khata-contact-settings',
  templateUrl: './khata-contact-settings.html',
  styleUrl: './khata-contact-settings.scss',
  imports: [RouterLink, KhataIcon, KhataAvatar, KhataSkeleton, KhataMissing],
})

export class KhataContactSettings {
  protected readonly info = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly missing = signal('');
  private readonly router = inject(Router);
  private readonly ui = inject(KhataUiService);
  protected readonly customer = KHATA_CUSTOMER;
  protected readonly supplier = KHATA_SUPPLIER;
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(KhataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(KhataStateService);
  protected readonly notify = signal<KhataNotify | null>(null);
  protected readonly contact = signal<KhataContact | null>(null);
  protected readonly invalid = signal<Record<string, boolean>>({});
  protected readonly channels: (keyof KhataNotify)[] = ['app', 'sms', 'email'];
  protected readonly bookId = computed(() => Number(this.params().get('bookId')));
  protected readonly contactId = computed(() => Number(this.params().get('contactId')));
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.cs.title')));
    effect(() => {
      const bookId = this.bookId();
      const contactId = this.contactId();
      untracked(() => void this.load(bookId, contactId));
    });
  }

  // #region Public Methods

  async remove(): Promise<void> {
    const contact = this.contact();
    if (!contact || this.busy() || !(await this.ui.confirm(this.i18n.t('khata.cs.deleteTitle', { name: contact.name }))))
      return;
    await this.run(async () => {
      await this.api.deleteContact(contact.id);
      this.ui.notify(this.i18n.t('khata.cs.deleted', { name: contact.name }));
      void this.state.loadBooks().catch(() => null);
      void this.router.navigate(['/khata/app/b', this.bookId(), 'parties'], { replaceUrl: true });
    });
  }

  async save(form: HTMLFormElement): Promise<void> {
    const contact = this.contact();
    if (!contact || this.busy())
      return;
    const data = new FormData(form);
    const text = (key: string): string => String(data.get(key) ?? '').trim();
    const errors = contactErrors(text('name'), text('mobile'), text('email'));
    this.invalid.set(errors);
    this.info.set('');
    if (Object.values(errors).some(Boolean)) {
      this.error.set(this.i18n.t('khata.c.invalid'));
      return;
    }
    const request = { name: text('name'), mobile: text('mobile') || undefined, email: text('email') || undefined, address: text('address') || undefined, note: text('note') || undefined, contactType: Number(data.get('type')) as KhataContactType, rowVersion: contact.rowVersion };
    await this.run(async () => {
      this.contact.set(await this.api.updateContact(contact.id, request));
      this.info.set(this.i18n.t('khata.cs.saved'));
    });
  }

  /** Turning the switch on asks to confirm; when that is cancelled or fails, the box goes back. */
  async toggle(box: HTMLInputElement): Promise<void> {
    const contact = this.contact();
    const allow = box.checked;
    if (!contact)
      return;
    if (allow && !(await this.ui.confirm(this.i18n.t('khata.cs.allowTitle', { name: contact.name })))) {
      box.checked = false;
      return;
    }
    await this.run(async () => this.contact.set(await this.api.setPermission(contact.id, allow)));
    box.checked = this.contact()?.allowContactEntries ?? false;
  }

  /**
   * Turns one way of telling this party about entries on or off. Email needs the party's email and SMS their mobile number: when it is missing
   * the switch goes back at once and the reader is told what to add (the API checks the same).
   */
  async toggleChannel(channel: keyof KhataNotify, box: HTMLInputElement): Promise<void> {
    const contact = this.contact();
    const current = this.notify();
    const on = box.checked;
    if (!contact || !current)
      return;
    const missing = on && ((channel === 'email' && !contact.email) || (channel === 'sms' && !contact.mobile));
    if (missing) {
      box.checked = false;
      this.info.set('');
      this.error.set(this.i18n.t(channel === 'email' ? 'khata.cs.notifyNeedEmail' : 'khata.cs.notifyNeedMobile', { name: contact.name }));
      return;
    }
    await this.run(async () => {
      this.notify.set(await this.api.setNotifications(contact.id, { ...current, [channel]: on }));
      this.info.set(this.i18n.t(on ? 'khata.cs.notifyOn' : 'khata.cs.notifyOff', { name: contact.name, channel: this.i18n.t('khata.cs.ch.' + channel) }));
    });
    box.checked = this.notify()?.[channel] ?? false;
  }

  // #endregion

  // #region Private Methods

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

  private async load(bookId: number, contactId: number): Promise<void> {
    if (!bookId || !contactId)
      return;
    this.missing.set('');
    this.contact.set(null);
    this.state.bookId.set(bookId);
    try {
      const contact = (await this.api.contacts(bookId)).contacts.find((c) => c.id === contactId) ?? null;
      this.contact.set(contact);
      if (!contact)
        this.missing.set(this.i18n.t('khata.nf.lead'));
      else
        this.notify.set(contact.notify ?? (await this.api.notifications(contact.id)));
    } catch (e) {
      const err = e as Error & { status?: number };
      (err.status === 404 ? this.missing : this.error).set(err.message);
    }
  }

  // #endregion
}
