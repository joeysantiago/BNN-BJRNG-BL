import { FeatureGroup, FeatureInfo } from '../../core/models/app-settings.model';

export interface ConfigGroup {
  id: FeatureGroup;
  label: string;
  help: string;
  items: FeatureInfo[];
}
