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
  template: `
    <div class="wrap page">
      <section class="card box">
        <p class="code inset" aria-hidden="true">{{ c.code }}</p>
        <h1>{{ i18n.t(c.h) }}</h1>
        <p class="msg">{{ i18n.t(c.p) }}</p>
        <a class="btn pri lg" [routerLink]="i18n.info().home">{{ i18n.t(c.cta) }}</a>
      </section>
    </div>
  `,
  styles: `
    .page {
      padding-block: 32px 0;
    }
    .box {
      max-width: 560px;
      margin-inline: auto;
      text-align: center;
    }
    .code {
      display: inline-grid;
      place-items: center;
      min-width: 120px;
      padding: 16px 28px;
      margin: 0 0 20px;
      font: 800 3rem/1 var(--inset-font);
    }
    h1 {
      font-family: var(--font-display);
      font-size: clamp(1.7rem, 5vw, 2.4rem);
      font-weight: 600;
    }
    .msg {
      color: var(--muted);
      margin-bottom: 24px;
    }
  `,
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
