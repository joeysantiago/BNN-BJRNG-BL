/** One sitemap.xml entry. `alt` adds the hreflang links of the three speed test languages. */
export interface SitemapEntry {
  alt?: boolean;
  path: string;
  priority: string;
}

/**
 * The pages of the site or of one feature (a *.pages.json file): what is prerendered, what is listed in sitemap.xml, and the apps that install on
 * their own at /apps/<code>/ (scripts/postbuild.mjs writes their app shells).
 */
export interface SitePages {
  apps?: string[];
  prerender: string[];
  sitemap: SitemapEntry[];
}
