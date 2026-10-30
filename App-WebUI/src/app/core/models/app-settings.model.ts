import { Lang } from '../site';

export type ServiceGroup = 'apps' | 'telecom';

export type PageName = Record<Lang, string>;

export type PageId = 'speed' | 'connection' | 'services' | 'about' | 'privacy' | 'terms' | 'creta' | 'nexon' | 'hr' | 'khata';

export type ConnectionField = 'isp' | 'ip' | 'ipv4' | 'ipv6' | 'mac' | 'location' | 'testServer' | 'networkType';

export type FeatureGroup = 'site' | 'pages' | 'speed' | 'youtube' | 'audio';

/** A part of the /master page that has its own Save button. */
export type SettingsSection = FeatureGroup | 'connection' | 'services';

export type FeatureId =
  | 'site.install' | 'site.theme' | 'site.language' | 'site.nav' | 'site.footer'
  | 'page.speed' | 'page.youtube' | 'page.creta' | 'page.nexon' | 'page.hr' | 'page.about' | 'page.privacy' | 'page.terms' | 'page.khata'
  | 'speed.clock' | 'speed.progress' | 'speed.loaded' | 'speed.share' | 'speed.save' | 'speed.image' | 'speed.history' | 'speed.info'
  | 'yt.search' | 'yt.play' | 'yt.video' | 'yt.seek' | 'yt.shuffle' | 'yt.repeat' | 'yt.volume' | 'yt.queue' | 'yt.playlists' | 'yt.download'
  | 'audio.doodle' | 'audio.seek' | 'audio.shuffle' | 'audio.repeat' | 'audio.volume' | 'audio.playlist' | 'audio.edit';

export interface FeatureInfo {
  id: FeatureId;
  help: string;
  label: string;
  group: FeatureGroup;
}

export type FeatureFlags = Record<FeatureId, boolean>;

/** Unsaved edits made on the /master page. Kept in memory only (never in browser storage); only what differs from the settings loaded from the API. */
export interface SettingsOverrides {
  features?: Partial<FeatureFlags>;
  speed?: { gaugeStops?: number[] };
  connection?: { enabled?: boolean; fields?: Partial<Record<ConnectionField, boolean>> };
  services?: { enabled?: boolean; refreshSeconds?: number; items?: Record<string, boolean> };
}

export interface ServiceConfig {
  id: string;
  /** Home page. Used for the reachability check and as the link target. */
  url: string;
  /** Brand name. Shown as written in every language. */
  name: string;
  /** Set to false to hide the service. */
  enabled: boolean;
  /** Address used for the reachability check when the home page cannot be used (for example it blocks cross-site requests). */
  probeUrl?: string;
  group: ServiceGroup;
  /** Base address of a public Atlassian Statuspage (https://host). When set, the official status is used. */
  statusPage?: string;
}

export interface AppSettings {
  /** Turn single features on or off. A page that is off shows "page not found"; a feature that is off disappears from its page. */
  features: FeatureFlags;
  speed: {
    /** Speeds in Mbps printed on the speed test gauge, evenly spaced around the ring. The first is 0 and each is larger than the one before. */
    gaugeStops: number[];
  };
  /** Page names per language, used in the menu, footer and section headings. */
  pageNames: Record<PageId, PageName>;
  connection: {
    /** Turn the whole "Your connection details" section on or off. */
    enabled: boolean;
    /** Turn single rows on or off. Rows appear in the order of the keys below. */
    fields: Record<ConnectionField, boolean>;
  };
  services: {
    /** Turn the whole "Services status" section on or off. */
    enabled: boolean;
    /** Seconds between automatic re-checks while the page is open. 0 turns auto refresh off. */
    refreshSeconds: number;
    items: ServiceConfig[];
  };
}
