import { SITE_NAME } from '../core/site';
import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { SettingsService } from '../core/settings.service';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})

export class SiteFooter {
  protected readonly site = SITE_NAME;
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  protected readonly year = new Date().getFullYear();
}
