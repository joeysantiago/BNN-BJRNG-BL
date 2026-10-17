import { Lang } from '../site';

export interface SeoConfig {
  lang: Lang;
  /** Path with a trailing slash, for example "/HR/". */
  path: string;
  /** File name inside /og/, for example "speedtest". */
  image: string;
  title: string;
  imageAlt?: string;
  jsonLd?: object[];
  /** Pages that should not appear in search results. */
  noindex?: boolean;
  description: string;
  /** Alternate language URLs, as { lang: path }. */
  alternates?: Partial<Record<Lang, string>>;
}
