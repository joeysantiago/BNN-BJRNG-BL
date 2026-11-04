/**
 * Runs after `ng build`.
 *  1. Creates 404.html. The web server shows it for any address without a file. It is the browser shell of the app,
 *     so the router can decide: redirect (/hr to /HR, /Creta to /creta) or show the "Page not found" page.
 *  2. Checks that every page that must exist was prerendered.
 *  3. Writes robots.txt and sitemap.xml.
 * The page lists come from src/app/shared.pages.json and every feature's src/app/pages/<feature>/*.pages.json,
 * the same files app.routes.server.ts prerenders, so a branch that deletes a feature folder drops its pages here too.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'thakurg', 'browser');
const app = join(root, 'src', 'app');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
// The speed test (home page) first, then the other features in folder order, then the shared pages.
const features = readdirSync(join(app, 'pages'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(app, 'pages', d.name)).filter((f) => f.endsWith('.pages.json')).map((f) => join(app, 'pages', d.name, f)))
  .sort((a, b) => Number(!a.includes('speedtest')) - Number(!b.includes('speedtest')) || a.localeCompare(b));
const lists = [...features.map(readJson), readJson(join(app, 'shared.pages.json'))];

copyFileSync(join(dist, 'index.csr.html'), join(dist, '404.html'));
console.log('created 404.html');

// Every app this branch holds installs on its own at /apps/<code>/ (the scope and start address of its manifest). The address needs a real file,
// so the web server answers 200 with the app shell (index.html keeps the path and opens the app's screen). The codes come from "apps" in *.pages.json.
const installable = [...new Set(lists.flatMap((l) => l.apps ?? []))];
for (const code of installable) {
  mkdirSync(join(dist, 'apps', code), { recursive: true });
  copyFileSync(join(dist, 'index.csr.html'), join(dist, 'apps', code, 'index.html'));
}
console.log(`created the app shells: ${installable.map((c) => '/apps/' + c + '/').join(', ') || 'none'}`);

const pages = lists.flatMap((l) => l.prerender);
const missing = pages.filter((p) => !existsSync(join(dist, p, 'index.html')));
if (missing.length) {
  console.error('Missing prerendered pages: ' + missing.map((m) => '/' + m).join(', '));
  process.exit(1);
}

// A prerendered home page must contain its heading as real HTML. A feature branch without the speed test has no prerendered home
// (its home address redirects to its app in the browser), so the check only runs when the home page is in the prerender list.
const home = pages.includes('') ? readFileSync(join(dist, 'index.html'), 'utf8') : '<h1>';
if (!/<h1[^>]*>/.test(home)) {
  console.error('Home page was not prerendered with content.');
  process.exit(1);
}
// The login page is in the sitemap: it must carry its heading and its own canonical address.
const login = readFileSync(join(dist, 'login', 'index.html'), 'utf8');
if (!/<h1[^>]*>/.test(login) || !login.includes('<link rel="canonical" href="https://thakurg.com/login/"')) {
  console.error('Login page was not prerendered with its heading and canonical link.');
  process.exit(1);
}
console.log(`ok: ${pages.length} pages prerendered`);


// ---- robots.txt and sitemap.xml, generated for the dist folder ----
const DOMAIN = 'thakurg.com';
const SITE = `https://${DOMAIN}`;
const today = new Date().toISOString().slice(0, 10);


writeFileSync(
  join(dist, 'robots.txt'),
  [
    '# Everything is open to crawlers. Pages that should not be listed (error, offline, the Atrium app frame) carry a',
    '# noindex tag, which Google can only read if it is allowed to fetch them.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n'),
);

// Pages that belong in search results. The speed test has three language versions that point at each other (entries with alt: true).
const langs = [
  ['en', '/'],
  ['hi', '/hi/'],
  ['ar', '/ar/'],
];
const entries = lists.flatMap((l) => l.sitemap);
const alternates = [...langs.map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${p}" />`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`].join('\n');
const urls = entries
  .map((e) => `  <url>\n    <loc>${SITE}${e.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${e.priority}</priority>${e.alt ? '\n' + alternates : ''}\n  </url>`)
  .join('\n');
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
);
console.log('generated robots.txt, sitemap.xml');
