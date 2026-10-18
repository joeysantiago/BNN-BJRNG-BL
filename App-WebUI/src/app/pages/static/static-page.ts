import { Kind } from './static-page.model';
import { SeoService } from '../../core/seo.service';
import { I18nService } from '../../core/i18n.service';
import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationKey } from '../../core/models/i18n.model';

@Component({
  selector: 'app-static-page',
  imports: [RouterLink],
  templateUrl: './static-page.html',
  styleUrl: './static-page.scss',
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
