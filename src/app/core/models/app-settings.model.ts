import { Lang } from '../site';

export type ServiceGroup = 'apps' | 'telecom';

export type PageName = Record<Lang, string>;

export type PageId = 'speed' | 'connection' | 'services' | 'about' | 'privacy' | 'terms' | 'creta' | 'nexon' | 'hr';

export type ConnectionField = 'isp' | 'ip' | 'ipv4' | 'ipv6' | 'mac' | 'location' | 'testServer' | 'networkType';

export type FeatureGroup = 'site' | 'pages' | 'speed' | 'youtube' | 'audio';

export type FeatureId =
  | 'site.install' | 'site.theme' | 'site.language' | 'site.nav' | 'site.footer'
  | 'page.speed' | 'page.youtube' | 'page.creta' | 'page.nexon' | 'page.hr' | 'page.about' | 'page.privacy' | 'page.terms'
  | 'speed.clock' | 'speed.progress' | 'speed.loaded' | 'speed.share' | 'speed.save' | 'speed.image' | 'speed.history' | 'speed.info'
  | 'yt.search' | 'yt.play' | 'yt.video' | 'yt.seek' | 'yt.shuffle' | 'yt.repeat' | 'yt.volume' | 'yt.queue' | 'yt.playlists' | 'yt.download'
  | 'audio.doodle' | 'audio.seek' | 'audio.shuffle' | 'audio.repeat' | 'audio.volume' | 'audio.playlist' | 'audio.edit';

export interface FeatureInfo {
  id: FeatureId;
  group: FeatureGroup;
  label: string;
  help: string;
}

export type FeatureFlags = Record<FeatureId, boolean>;

/** What the /config page saves in this browser. Only what differs from appSettings.ts is stored. */
export interface SettingsOverrides {
  features?: Partial<FeatureFlags>;
  connection?: { enabled?: boolean; fields?: Partial<Record<ConnectionField, boolean>> };
  services?: { enabled?: boolean; refreshSeconds?: number; items?: Record<string, boolean> };
  youtube?: Partial<AppSettings['youtube']>;
}

export interface ServiceConfig {
  id: string;
  /** Brand name. Shown as written in every language. */
  name: string;
  group: ServiceGroup;
  /** Set to false to hide the service. */
  enabled: boolean;
  /** Home page. Used for the reachability check and as the link target. */
  url: string;
  /** Address used for the reachability check when the home page cannot be used (for example it blocks cross-site requests). */
  probeUrl?: string;
  /** Base address of a public Atlassian Statuspage (https://host). When set, the official status is used. */
  statusPage?: string;
}

export interface AppSettings {
  githubRepo: string;
  youtube: {
    /** YouTube Data API v3 key. Leave empty to play pasted links only. */
    apiKey: string;
    /** Address of the helper server (scripts/youtube-server.mjs) that makes the 320 kbps MP3 downloads. */
    server: string;
    /** The helper's YT_TOKEN, if it has one. */
    token: string;
  };
  /** Turn single features on or off. A page that is off shows "page not found"; a feature that is off disappears from its page. */
  features: FeatureFlags;
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
