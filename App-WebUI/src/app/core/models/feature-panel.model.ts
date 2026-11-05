import { Type } from '@angular/core';

/**
 * A part of the central Settings or Profile page that one app brings (feature-routes.ts lists them per branch). The shared page loads it lazily, so it never imports
 * feature code: Settings > General shows it in that app's section, Profile under the account cards, only for an app the user may open.
 */
export interface FeaturePanel {
  app: string;
  order: number;
  load: () => Promise<Type<unknown>>;
}
