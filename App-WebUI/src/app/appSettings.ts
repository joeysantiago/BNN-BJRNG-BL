import { FEATURES } from './core/features';
import { AppSettings, ConnectionField, FeatureId } from './core/models/app-settings.model';

const CONNECTION_FIELDS: ConnectionField[] = ['isp', 'ip', 'ipv4', 'ipv6', 'mac', 'location', 'testServer', 'networkType'];

/** Speeds in Mbps printed on the gauge when the API has none: Mbps up to 750, then 1, 2.5, 5 and 10 Gbps. */
export const DEFAULT_GAUGE_STOPS = [0, 5, 10, 25, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000];

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
  speed: { gaugeStops: DEFAULT_GAUGE_STOPS },
};
