import { Kind } from './status-page.model';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

const COPY = {
  '404': { h: 'nf.h1', p: 'nf.p', cta: 'nf.home', title: 'seo.404.title', desc: 'seo.404.desc', code: '404' },
  error: { h: 'err.h1', p: 'err.p', cta: 'err.home', title: 'seo.error.title', desc: 'seo.error.desc', code: '!' },
  offline: { h: 'offpage.h1', p: 'offpage.p', cta: 'nf.home', title: 'seo.offline.title', desc: 'seo.offline.desc', code: '⚡' },
} as const;

/** One page for "page not found", "something went wrong" and "you are offline". Chosen by route data. */
@Component({
  selector: 'app-status-page',
  imports: [RouterLink],
  templateUrl: './status-page.html',
  styleUrl: './status-page.scss',
})

export class StatusPage {
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  protected readonly c = COPY[inject(ActivatedRoute).snapshot.data['kind'] as Kind];

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t(this.c.title),
        description: this.i18n.t(this.c.desc),
        path: '/',
        image: 'default',
        lang: this.i18n.lang(),
        noindex: true,
      });
    });
  }
}
