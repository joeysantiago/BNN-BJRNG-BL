import { FEATURES } from './core/features';
import { AppSettings, ConnectionField, FeatureId } from './core/models/app-settings.model';

const CONNECTION_FIELDS: ConnectionField[] = ['isp', 'ip', 'ipv4', 'ipv6', 'mac', 'location', 'testServer', 'networkType'];

/**
 * Structure only, no data. The real settings (features, page names, services, connection rows) live in the master tables and
 * arrive from `GET /settings`. This is used only when the API cannot be reached, so the app still renders: every feature is on,
 * the two optional sections are hidden, and pages are named by their id.
 */
export const EMPTY_SETTINGS: AppSettings = {
  features: Object.fromEntries(FEATURES.map((f) => [f.id, true])) as Record<FeatureId, boolean>,
  pageNames: {} as AppSettings['pageNames'],
  connection: { enabled: false, fields: Object.fromEntries(CONNECTION_FIELDS.map((f) => [f, false])) as Record<ConnectionField, boolean> },
  services: { enabled: false, refreshSeconds: 0, items: [] },
};
