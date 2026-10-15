# thakurg.com

Angular 22 site hosted on GitHub Pages. Every page is prerendered to plain HTML at build time.

| Address | What it is |
|---|---|
| `/` , `/hi/` , `/ar/` | Internet speed test in English, Hindi and Arabic (Arabic is right to left) |
| `/HR/` | Atrium HR demo app (`/hr` redirects here) |
| `/creta/` | Audio player for the files in `public/audio` |
| `/about/` `/privacy/` `/terms/` | Static pages |
| `/offline/` `/error/` and any unknown address | "You are offline", "Something went wrong" and "Page not found" |

## Commands

```bash
npm install
npm start          # dev server at http://localhost:4200
npm run build      # production build into dist/thakurg/browser, creates 404.html
npm run images     # redraws the share images and app icons (needs Chrome or Edge)
```

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages.
In the repository settings, set **Pages > Source** to **GitHub Actions**. The build writes `CNAME` for `thakurg.com` into `dist`.

## Adding audio to /creta

Copy the files into `public/audio/` and run `npm run build`. The playlist is created from the folder by `scripts/build-playlist.mjs`, in file name order, with the title taken from the file name. An image with the same name (`song.mp3` and `song.jpg`) becomes the cover. Only publish audio you have the rights to share.

## How it works

- **Speed test**: measures ping, jitter, download and upload against `speed.cloudflare.com` (`src/app/core/speed-engine.service.ts`).
- **Save and share**: results are saved in the browser's `localStorage` only. No IP address is used and nothing is sent to a server. Share opens the device share sheet (with a result image) or WhatsApp, Facebook, X and Telegram links.
- **Languages**: strings live in `src/app/i18n/en.ts`, `hi.ts`, `ar.ts`. `en.ts` defines every key, and the build fails if Hindi or Arabic is missing one. The Hindi and Arabic text is a draft and should be reviewed.
- **Themes**: Glassmorphism, Claymorphism, Skeuomorphism, Neumorphism. All four are token sets in `src/styles.scss`; the choice is remembered in `localStorage`.
- **Install and offline**: `public/manifest.webmanifest` and the Angular service worker (`ngsw-config.json`) make the site installable and let the speed test open without a connection.
- **Share images**: `public/og/*.png` are 1200 x 630, one per page (`speedtest`, `hr`, `creta`, `default`). Edit the cards in `scripts/generate-images.mjs` and run `npm run images`.
- **Atrium HR**: the app is the self-contained page `public/atrium/app.html`, shown full screen inside `/HR/`. The text under it is what search engines read.
- **SEO**: each page sets its own title, description, canonical URL, Open Graph and Twitter tags, `hreflang` (speed test) and JSON-LD in `src/app/core/seo.service.ts`. `CNAME`, `robots.txt` and `sitemap.xml` are generated into `dist` by `scripts/postbuild.mjs`; add new pages to its list.

## Notes

- GitHub Pages is case sensitive. `/HR/` and `/creta/` are the real folders; `/hr` and `/Creta` are redirects handled by `404.html`.
- Do not prerender redirect routes: on Windows `hr` and `HR` are the same folder (see `src/app/app.routes.server.ts`).
