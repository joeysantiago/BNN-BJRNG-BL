import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { SeoService } from '../../core/seo.service';
import { TranslationKey } from '../../i18n/en';

type Kind = 'about' | 'privacy' | 'terms';

@Component({
  selector: 'app-static-page',
  imports: [RouterLink],
  template: `
    <div class="wrap page">
      <article class="card prose">
        <h1>{{ i18n.t(heading) }}</h1>
        @for (k of paragraphs; track k) {
          <p>{{ i18n.t(k) }}</p>
        }
        @if (kind === 'about') {
          <h2>{{ i18n.t('about.h2.tools') }}</h2>
          <ul>
            <li><a [routerLink]="i18n.info().home">{{ i18n.t('about.l.speed') }}</a></li>
            <li><a routerLink="/HR/">{{ i18n.t('about.l.hr') }}</a></li>
            <li><a routerLink="/creta/">{{ i18n.t('about.l.creta') }}</a></li>
          </ul>
        }
      </article>
    </div>
  `,
  styles: `
    .page {
      padding-block: 24px 0;
    }
    h1 {
      font-family: var(--font-display);
      font-size: clamp(1.8rem, 5vw, 2.6rem);
      font-weight: 600;
    }
  `,
})
export class StaticPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);

  protected readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as Kind;
  protected readonly heading = `${this.kind}.h1` as TranslationKey;
  protected readonly paragraphs = (this.kind === 'about' ? [1, 2, 3] : [1, 2, 3, 4, 5]).map((i) => `${this.kind}.p${i}` as TranslationKey);

  constructor() {
    effect(() => {
      this.seo.set({
        title: this.i18n.t(`seo.${this.kind}.title` as TranslationKey),
        description: this.i18n.t(`seo.${this.kind}.desc` as TranslationKey),
        path: `/${this.kind}/`,
        image: 'default',
        lang: this.i18n.lang(),
      });
    });
  }
}
