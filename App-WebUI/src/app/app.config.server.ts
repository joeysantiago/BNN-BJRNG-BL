import { appConfig } from './app.config';
import { StaticTexts } from './core/static-texts';
import { serverRoutes } from './app.routes.server';
import { ServerStaticTexts } from './core/static-texts.server';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';

const serverConfig: ApplicationConfig = {
  // The prerender reads the built-in texts from disk instead of fetching them.
  providers: [provideServerRendering(withRoutes(serverRoutes)), { provide: StaticTexts, useClass: ServerStaticTexts }],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
