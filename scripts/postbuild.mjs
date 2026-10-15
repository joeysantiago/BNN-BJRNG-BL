/**
 * Runs after `ng build`.
 *  1. Creates 404.html. GitHub Pages shows it for any address without a file. It is the browser shell of the app,
 *     so the router can decide: redirect (/hr to /HR, /Creta to /creta) or show the "Page not found" page.
 *  2. Checks that every page that must exist was prerendered.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'dist', 'thakurg', 'browser');

copyFileSync(join(dist, 'index.csr.html'), join(dist, '404.html'));
console.log('created 404.html');

const pages = ['', 'hi', 'ar', 'HR', 'creta', 'about', 'privacy', 'terms', 'offline', 'error'];
const missing = pages.filter((p) => !existsSync(join(dist, p, 'index.html')));
if (missing.length) {
  console.error('Missing prerendered pages: ' + missing.map((m) => '/' + m).join(', '));
  process.exit(1);
}

// A prerendered page must contain its heading as real HTML.
const home = readFileSync(join(dist, 'index.html'), 'utf8');
if (!/<h1[^>]*>/.test(home)) {
  console.error('Home page was not prerendered with content.');
  process.exit(1);
}
console.log(`ok: ${pages.length} pages prerendered`);


// ---- CNAME, robots.txt and sitemap.xml, generated for the dist folder ----
const DOMAIN = 'thakurg.com';
const SITE = `https://${DOMAIN}`;
const today = new Date().toISOString().slice(0, 10);

writeFileSync(join(dist, 'CNAME'), DOMAIN);
writeFileSync(join(dist, '.nojekyll'), '');

writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /atrium/\nDisallow: /error/\nDisallow: /offline/\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

// Pages that belong in search results. The speed test has three language versions that point at each other.
const langs = [
  ['en', '/'],
  ['hi', '/hi/'],
  ['ar', '/ar/'],
];
const entries = [
  ...langs.map(([, path]) => ({ path, priority: path === '/' ? '1.0' : '0.9', alt: true })),
  { path: '/HR/', priority: '0.7' },
  { path: '/creta/', priority: '0.6' },
  { path: '/about/', priority: '0.3' },
  { path: '/privacy/', priority: '0.2' },
  { path: '/terms/', priority: '0.2' },
];
const alternates = [...langs.map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${p}" />`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`].join('\n');
const urls = entries
  .map((e) => `  <url>\n    <loc>${SITE}${e.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${e.priority}</priority>${e.alt ? '\n' + alternates : ''}\n  </url>`)
  .join('\n');
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
);
console.log('generated CNAME, robots.txt, sitemap.xml');
