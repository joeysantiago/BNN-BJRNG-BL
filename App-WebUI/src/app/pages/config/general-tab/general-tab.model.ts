import { Type } from '@angular/core';
import { FeatureInfo } from '../../../core/models/app-settings.model';
import { FeaturePanel } from '../../../core/models/feature-panel.model';

/** One app's section of Settings > General: its name, its site switches and the settings the app brings (FEATURE_SETTINGS). */
export interface AppSection {
  code: string;
  name: string;
  page: string;
  canRename: boolean;
  panels: FeaturePanel[];
  features: FeatureInfo[];
}

/** The loaded settings components of each app, by app code. */
export type LoadedPanels = Record<string, Type<unknown>[]>;
