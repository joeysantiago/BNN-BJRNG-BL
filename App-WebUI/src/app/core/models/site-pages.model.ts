/** One sitemap.xml entry. `alt` adds the hreflang links of the three speed test languages. */
export interface SitemapEntry {
  alt?: boolean;
  path: string;
  priority: string;
}

/** The pages of the site or of one feature (a *.pages.json file): what is prerendered and what is listed in sitemap.xml. */
export interface SitePages {
  prerender: string[];
  sitemap: SitemapEntry[];
}
