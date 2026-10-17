import { routes } from './app.routes';
import { I18nService } from './core/i18n.service';
import { SettingsService } from './core/settings.service';
import { provideServiceWorker } from '@angular/service-worker';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTrailingSlashUrls } from './core/trailing-slash.serializer';
import { ApplicationConfig, PLATFORM_ID, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { APP_BASE_HREF, HashLocationStrategy, LocationStrategy, PathLocationStrategy, PlatformLocation, isPlatformBrowser } from '@angular/common';

/** Addresses use the hash (/#/creta) in the browser. The server keeps plain paths, so prerendering and the dev server do not redirect. */
const locationStrategy = () => {
  const platform = inject(PlatformLocation);
  const base = inject(APP_BASE_HREF, { optional: true });
  return isPlatformBrowser(inject(PLATFORM_ID)) ? new HashLocationStrategy(platform, base ?? undefined) : new PathLocationStrategy(platform, base ?? undefined);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The settings and every language's texts come from the API (master tables). Wait for them so the first render, prerendered or not, already has them.
    provideAppInitializer(() => Promise.all([inject(SettingsService).load(), inject(I18nService).load()])),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    { provide: LocationStrategy, useFactory: locationStrategy },
    provideTrailingSlashUrls(),
    provideClientHydration(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:15000',
    }),
  ],
};
