import { DefaultUrlSerializer, UrlSerializer, UrlTree } from '@angular/router';

/**
 * Every page lives at a URL with a trailing slash (/HR/, /creta/, /hi/), because GitHub Pages serves pages from folders
 * and redirects /HR to /HR/. This serializer accepts both forms when reading a URL and always writes the slash form,
 * so links, canonical tags and the address bar agree.
 */
export class TrailingSlashSerializer extends DefaultUrlSerializer {
  // #region Public Methods

  override parse(url: string): UrlTree {
    return super.parse(url.replace(/\/+(?=$|[?#])/, '') || '/');
  }

  override serialize(tree: UrlTree): string {
    const url = super.serialize(tree);
    const i = url.search(/[?#]/);
    const path = i < 0 ? url : url.slice(0, i);
    const rest = i < 0 ? '' : url.slice(i);
    return (path.endsWith('/') ? path : path + '/') + rest;
  }

  // #endregion
}

export const provideTrailingSlashUrls = () => ({ provide: UrlSerializer, useClass: TrailingSlashSerializer });
