# App-Prototype

Clickable prototype of thakurg.com, split into one HTML page per feature with a master dashboard.

- Open `index.html` (double-click works, or serve the folder, e.g. `npx http-server App-Prototype`).
- `thakurg.html` is the original single-file prototype, kept unchanged as a backup.
- Each page in `pages/` also works on its own; it then links to the other page files directly.

## Pages and features

| Page | Addresses | Feature | CSS | JS |
|---|---|---|---|---|
| `pages/speedtest.html` | `/`, `/hi`, `/ar` | Speed test (gauge, phases, history, share), connection details, services status | `speedtest`, `connection-details`, `service-status` | `speedtest`, `connection-details`, `service-status` |
| `pages/youtube.html` | `/youtube` | YouTube music player (search, queue, shuffle, repeat) | `youtube` | `audio`, `youtube` |
| `pages/creta.html` | `/creta`, `/creta-add` | Creta audio player, playlist editing, add songs | `creta`, `dance-doodle`, `creta-add` | `audio`, `players`, `add-songs` |
| `pages/nexon.html` | `/nexon`, `/nexon-add` | Nexon audio player, playlist editing, add songs | same as Creta | same as Creta |
| `pages/hr.html` | `/HR` | Atrium HR demo app (embedded) and its about text | `atrium` | `data/atrium`, `hr` |
| `pages/khata.html` | `/khata`, `/khata/*` | SnapKhata: landing page, login, OTP, PIN, books, dashboard, parties, ledger, entries, entry form with bill photos, transaction details, contact settings, profile | `khata` | `data/currencies`, `khata/*` |
| `pages/snaptracker.html` | `/tracker/*` | SnapTracker: login, OTP, app password, lock, SMS dashboard, detected transactions, privacy, alerts, settings, simulated Android device | `snaptracker` | `snaptracker` |
| `pages/settings.html` | `/master` | Settings: feature switches, gauge stops, connection fields, services, YouTube key, player passwords, JSON import | `config` | `settings` |
| `pages/about.html`, `privacy.html`, `terms.html` | `/about`, `/privacy`, `/terms` | Static pages | `static-page` | `static` |
| `pages/status.html` | `/404`, `/error`, `/offline`, `/disabled`, any unknown address | Status pages | `status-page` | `static` |

Every thakurg.com page (all except SnapTracker) also loads the shared files: `fonts`, `base`, `site-header`, `site-footer`, `proto-menu` CSS, and `routes`, `bridge`, `data/dict`, `data/pages`, `data/messages`, `data/features`, `data/services`, `core` JS.

## Folder layout

```
App-Prototype/
├── index.html                 master dashboard (sidebar, header, content frame)
├── thakurg.html               original single file (backup, not used)
├── pages/                     one HTML file per feature (table above)
└── assets/
    ├── css/
    │   ├── dashboard.css      dashboard only (light and dark tokens)
    │   ├── fonts.css          Manrope, Fraunces, Noto Sans Devanagari / Arabic (inlined, so file:// works)
    │   ├── base.css           the four site skins and shared elements (cards, buttons, forms)
    │   ├── site-header.css, site-footer.css, proto-menu.css
    │   └── <feature>.css      one file per feature, as listed above
    └── js/
        ├── routes.js          THE route table: which page owns which address, sidebar labels and icons
        ├── bridge.js          PREFS (language, skin, light / dark) and BRIDGE (dashboard <-> page messages)
        ├── dashboard.js       dashboard behaviour
        ├── core.js            shared runtime of the site pages: texts, router, rendering, events, header, footer
        ├── data/              seed data: texts, page names, messages, features, services, currencies, Atrium app
        ├── khata/             SnapKhata, one file per screen group
        └── <feature>.js       one file per feature
```

The CSS and JS of the site pages were moved from `thakurg.html` as they were. Where code had to change for the split, it is marked with a `dashboard:` comment.

## How it fits together

- **One route table.** `assets/js/routes.js` lists every page, the addresses it owns, its sidebar group, icon and labels in en / hi / ar. The dashboard builds its sidebar from it, and each page uses it to decide which addresses are its own.
- **Navigation.** The dashboard address mirrors the page (`index.html#/khata/app`), so refresh, Back and shared links reopen the same screen. A link inside a page to another page's address (footer, "Prototype pages" menu, redirects) is handed to the dashboard, which loads that file into the content frame. On its own, the page goes straight to the other file.
- **Language and theme.** Managed in one place (`PREFS` in `bridge.js`, saved in localStorage as `thakurg-proto-lang`, `thakurg-proto-skin`, `thakurg-proto-mode`). The dashboard's Language and Theme menus change them and tell the page in the frame. Controls that already existed inside pages (the site header's skin and language pickers, SnapKhata's theme buttons and language setting, SnapTracker's theme toggle) change the same preferences, and the dashboard follows.
  - **Mode** (Light / Dark / System default) drives the dashboard, SnapKhata and SnapTracker.
  - **Site skin** (Glass, Clay, Skeu, Neu) drives the thakurg.com site pages, as before.
  - The speed test still takes its language from the address (`/`, `/hi`, `/ar`), and Atrium HR still switches to English, as in the original.
- **Settings across pages.** `/master` changes (switching a page off, gauge stops, services) are kept in sessionStorage, so they apply to the other pages for the rest of the browser tab, as they did inside the single file.

## Adding a feature page

1. Add its CSS in `assets/css/<name>.css` and its JS in `assets/js/<name>.js`.
2. Copy a page from `pages/` (for example `pages/youtube.html`), set `window.PAGE_ID`, and swap the feature `<link>` and `<script>` tags.
3. Add one entry to `ROUTES` in `assets/js/routes.js` (id = `PAGE_ID`, file, address pattern, group, icon, labels). The sidebar picks it up.
4. If the page draws through `core.js`, add its view to `view()` in `core.js`.

## Notes

- SnapKhata keeps its session in memory, like the real app. Leaving SnapKhata for another page and coming back is a page load, so it asks you to log in again, the same as a reload did in the single file. Books and entries stay (localStorage).
- SnapTracker's own screens are in English only; the dashboard language does not translate them.
