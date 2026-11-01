# thakurg.com

Angular 22 site served as static files from our own web server. Every page is prerendered to plain HTML at build time.

| Address | What it is |
|---|---|
| `/` , `/hi/` , `/ar/` | Internet speed test in English, Hindi and Arabic (Arabic is right to left) |
| `/HR/` | Atrium HR demo app (`/hr` redirects here) |
| `/creta/` , `/nexon/` | Audio players; the songs and their files are served by the API |
| `/about/` `/privacy/` `/terms/` | Static pages |
| `/offline/` `/error/` and any unknown address | "You are offline", "Something went wrong" and "Page not found" |

## Commands

```bash
npm install
npm start          # dev server at http://localhost:4200
npm run build      # live build (default) into dist/thakurg/browser, creates 404.html
npm run build:live # same as npm run build
npm run build:uat  # build against the UAT API
npm run build:qa   # build against the QA API
npm run images     # redraws the share images and app icons (needs Chrome or Edge)
```

## Environments

The API address per environment is in `src/environments/` (`environment.ts` = development, `environment.qa.ts`, `environment.uat.ts`, `environment.live.ts`). They hold only the non-secret API base URL and name. `ng build` uses the live one.

## Deploying

Run the build for the target environment and copy `dist/thakurg/browser` to the web server. The build reads the settings and every language's texts from that environment's API while it prerenders, so the API must be running and reachable when you build.

## Adding audio to /creta

Songs are managed on the API server (the `MusicTracks` master table and its media folder), not in this repository. The page reads the playlist from `GET /music/{player}/tracks`; adding or deleting songs on the page needs the edit password, which the server checks.

## How it works

- **Speed test**: measures ping, jitter, download and upload against our own API (`/speedtest/*`, `src/app/core/speed-engine.service.ts`).
- **Save and share**: results are saved in the browser's `localStorage` only. Saved results never leave the browser. Share opens the device share sheet (with a result image) or WhatsApp, Facebook, X and Telegram links.
- **Connection details and services status** (home page sections in `src/app/shared/`): all configured in the settings master tables and read from `GET /settings` at start-up (the API address is in `src/environments/`). `connection.fields` switches each row on or off, `services.items` lists the services and `pageNames` holds the page and section names per language. The test server and a fallback IP come from our API; provider and location come from ipwho.is and IPv4/IPv6 from ipify, called from the visitor's browser. A browser cannot read a MAC address, so that row says so. Services without a status API get a reachability check, shown as such and not an official status.
- **Languages**: no text lives in this code. Every string comes from the API (`GET /translations/{lang}`, the Translations master table: one row per page with English, Hindi and Arabic as JSON key/value) and is loaded at start-up by `src/app/core/i18n.service.ts`. A key with no text shows the key itself. The Hindi and Arabic text is a draft and should be reviewed.
- **Themes**: Glassmorphism, Claymorphism, Skeuomorphism, Neumorphism. All four are token sets in `src/styles.scss`; the choice is remembered in `localStorage`.
- **Install and offline**: `public/manifest.webmanifest` and the Angular service worker (`ngsw-config.json`) make the site installable and let the speed test open without a connection.
- **Share images**: `public/og/*.png` are 1200 x 630, one per page (`speedtest`, `hr`, `creta`, `default`). Edit the cards in `scripts/generate-images.mjs` and run `npm run images`.
- **Atrium HR**: the app is the self-contained page `public/atrium/app.html`, shown full screen inside `/HR/`. The text under it is what search engines read.
- **SEO**: each page sets its own title, description, canonical URL, Open Graph and Twitter tags, `hreflang` (speed test) and JSON-LD in `src/app/core/seo.service.ts`. `robots.txt` and `sitemap.xml` are generated into `dist` by `scripts/postbuild.mjs`; add new pages to its list.

## Notes

- Static hosting is case sensitive. `/HR/` and `/creta/` are the real folders; `/hr` and `/Creta` are redirects handled by `404.html`.
- Do not prerender redirect routes: on Windows `hr` and `HR` are the same folder (see `src/app/app.routes.server.ts`).

## YouTube page (/youtube/)

Plays a pasted YouTube link with YouTube's official embedded player (IFrame Player API), driven by the page's own controls (queue, shuffle, repeat, volume, seek, lock-screen buttons). Nothing runs on your computer and nothing extra is started: it is part of the normal build. The video stays visible and YouTube ads and terms apply.

Searching by song name, opening playlists, background audio and MP3 download go through our own API (`/youtube/*`); no key is needed in the browser.


