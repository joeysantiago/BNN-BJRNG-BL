import { join } from 'node:path';
import { Injectable } from '@angular/core';
import { readFile } from 'node:fs/promises';
import { StaticTexts } from './static-texts';

/** The prerender reads the built-in texts from public/i18n/ on disk (the build runs in App-WebUI), so it never waits for the API. */
@Injectable()

export class ServerStaticTexts extends StaticTexts {
  // #region Public Methods

  override async get<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(join(process.cwd(), 'public', 'i18n', file), 'utf8')) as T;
    } catch {
      return null;
    }
  }

  // #endregion
}
