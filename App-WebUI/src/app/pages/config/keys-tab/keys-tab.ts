import { Component, inject } from '@angular/core';
import { featureBuilt } from '../../../core/features';
import { FEATURE_APPS } from '../../../feature-routes';
import { I18nService } from '../../../core/i18n.service';
import { WhatsAppCard } from '../whatsapp-card/whatsapp-card';
import { MailServerForm } from '../mail-server-form/mail-server-form';
import { YoutubeKeyCard } from '../youtube-key-card/youtube-key-card';
import { QuickLoginsCard } from '../quick-logins-card/quick-logins-card';

/**
 * The Keys tab of the Settings page (super admin, password login; the API checks the same): the site's settings that hold a login, key or password,
 * which are never kept in the configuration files. The site's mail server (the "default" mail profile, used by every e-mail whose own profile is off),
 * its one-time code and notification profiles, the WhatsApp account, the YouTube API key (where the YouTube player is built) and the quick logins.
 */
@Component({
  selector: 'app-keys-tab',
  imports: [MailServerForm, WhatsAppCard, YoutubeKeyCard, QuickLoginsCard],
  templateUrl: './keys-tab.html',
  styleUrl: './keys-tab.scss',
})

export class KeysTab {
  protected readonly i18n = inject(I18nService);
  protected readonly hasYoutube = featureBuilt('youtube', FEATURE_APPS);
}
