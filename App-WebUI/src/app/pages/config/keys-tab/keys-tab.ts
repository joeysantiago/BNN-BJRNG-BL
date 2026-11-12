import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n.service';
import { StorageCard } from '../storage-card/storage-card';
import { WhatsAppCard } from '../whatsapp-card/whatsapp-card';
import { MailServerForm } from '../mail-server-form/mail-server-form';
import { QuickLoginsCard } from '../quick-logins-card/quick-logins-card';

/**
 * The Keys tab of the Settings page (super admin, password login; the API checks the same): the site's settings that hold a login, key or password,
 * which are never kept in the configuration files. The site's mail server (the "default" mail profile, used by every e-mail whose own profile is off),
 * its one-time code and notification profiles, the WhatsApp account, where every app keeps its files and the quick logins.
 */
@Component({
  selector: 'app-keys-tab',
  imports: [MailServerForm, WhatsAppCard, StorageCard, QuickLoginsCard],
  templateUrl: './keys-tab.html',
  styleUrl: './keys-tab.scss',
})

export class KeysTab {
  protected readonly i18n = inject(I18nService);
}
