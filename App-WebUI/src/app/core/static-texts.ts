import { Injectable } from '@angular/core';

/**
 * The texts built into the site: public/i18n/ (en.json, hi.json, ar.json and page-names.json), written from the database seed scripts by
 * scripts/build-texts.mjs before every build. The browser fetches them from the site itself, so they arrive at once even while the API sleeps;
 * the prerender reads them from disk (ServerStaticTexts in static-texts.server.ts).
 */
@Injectable({ providedIn: 'root' })

export class StaticTexts {
  // #region Public Methods

  /** One file of /i18n/, or null when it cannot be read. Never throws. */
  async get<T>(file: string): Promise<T | null> {
    try {
      const res = await fetch(`/i18n/${file}`);
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  }

  // #endregion
}
