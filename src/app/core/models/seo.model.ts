import { Lang } from '../site';

export interface SeoConfig {
  title: string;
  description: string;
  /** Path with a trailing slash, for example "/HR/". */
  path: string;
  /** File name inside /og/, for example "speedtest". */
  image: string;
  lang: Lang;
  imageAlt?: string;
  /** Pages that should not appear in search results. */
  noindex?: boolean;
  /** Alternate language URLs, as { lang: path }. */
  alternates?: Partial<Record<Lang, string>>;
  jsonLd?: object[];
}
