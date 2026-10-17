import { DOCUMENT } from '@angular/common';
import { SeoConfig } from './models/seo.model';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { LANGS, Lang, SITE_NAME, SITE_URL, langInfo } from './site';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);

  // #region Public Methods

  set(cfg: SeoConfig): void {
    const url = SITE_URL + cfg.path;
    const image = `${SITE_URL}/og/${cfg.image}.png`;
    const info = langInfo(cfg.lang);
    const alt = cfg.imageAlt ?? cfg.title;

    this.title.setTitle(cfg.title);
    this.setName('description', cfg.description);
    this.setName('robots', cfg.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

    this.setProp('og:type', 'website');
    this.setProp('og:site_name', SITE_NAME);
    this.setProp('og:title', cfg.title);
    this.setProp('og:description', cfg.description);
    this.setProp('og:url', url);
    this.setProp('og:locale', info.locale);
    this.setProp('og:image', image);
    this.setProp('og:image:secure_url', image);
    this.setProp('og:image:type', 'image/png');
    this.setProp('og:image:width', '1200');
    this.setProp('og:image:height', '630');
    this.setProp('og:image:alt', alt);

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', cfg.title);
    this.setName('twitter:description', cfg.description);
    this.setName('twitter:image', image);
    this.setName('twitter:image:alt', alt);

    if (cfg.noindex) {
      this.doc.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      this.setCanonical(url);
    }
    this.setAlternates(cfg.alternates);
    this.setJsonLd(cfg.jsonLd ?? []);
  }

  // #endregion

  // #region Private Methods

  private setCanonical(href: string): void {
    let el = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private setJsonLd(items: object[]): void {
    this.doc.head.querySelectorAll('script[data-seo-ld]').forEach((n) => n.remove());
    for (const item of items) {
      const el = this.doc.createElement('script');
      el.setAttribute('type', 'application/ld+json');
      el.setAttribute('data-seo-ld', '');
      el.textContent = JSON.stringify(item);
      this.doc.head.appendChild(el);
    }
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProp(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setAlternates(alternates?: Partial<Record<Lang, string>>): void {
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
    if (!alternates)
      return;
    const add = (hreflang: string, path: string) => {
      const el = this.doc.createElement('link');
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', hreflang);
      el.setAttribute('href', SITE_URL + path);
      this.doc.head.appendChild(el);
    };
    for (const l of LANGS) {
      const path = alternates[l.code];
      if (path)
        add(l.code, path);
    }
    if (alternates.en)
      add('x-default', alternates.en);
  }

  // #endregion
}
