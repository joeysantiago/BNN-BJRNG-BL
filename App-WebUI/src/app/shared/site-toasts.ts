import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { ToastService } from '../core/toast.service';

/** The toasts of the site, at the bottom of every page (also the full-screen apps). Errors are read out as alerts, the rest politely. */
@Component({
  selector: 'app-site-toasts',
  imports: [RouterLink],
  templateUrl: './site-toasts.html',
  styleUrl: './site-toasts.scss',
})

export class SiteToasts {
  protected readonly i18n = inject(I18nService);
  protected readonly toasts = inject(ToastService);
}
