/**
 * Runs after `ng build`.
 *  1. Creates 404.html. GitHub Pages shows it for any address without a file. It is the browser shell of the app,
 *     so the router can decide: redirect (/hr to /HR, /Creta to /creta) or show the "Page not found" page.
 *  2. Checks that every page that must exist was prerendered.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
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

