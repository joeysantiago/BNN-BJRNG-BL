import { Lang } from '../site';

export type ServiceGroup = 'apps' | 'telecom';

export type PageName = Record<Lang, string>;

export type PageId = 'speed' | 'connection' | 'services' | 'about' | 'privacy' | 'terms' | 'creta' | 'nexon' | 'hr';

export type ConnectionField = 'isp' | 'ip' | 'ipv4' | 'ipv6' | 'mac' | 'location' | 'testServer' | 'networkType';

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
