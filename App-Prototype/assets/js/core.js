/* Shared runtime of every thakurg.com page: texts, router, rendering, events, header, footer and small helpers.
   Moved from thakurg.html; the page-to-page parts (handing an address to another page, preferences from the dashboard) are marked "dashboard". */
'use strict';

const LANGS = [
  { code: 'en', native: 'English', dir: 'ltr', locale: 'en-US', home: '/' },
  { code: 'hi', native: 'हिन्दी', dir: 'ltr', locale: 'hi-IN', home: '/hi' },
  { code: 'ar', native: 'العربية', dir: 'rtl', locale: 'ar-AE', home: '/ar' },
];
const SKINS = [
  { id: 'glass', labelKey: 'theme.glass', chrome: '#170a1c' },
  { id: 'clay', labelKey: 'theme.clay', chrome: '#f1e3fb' },
  { id: 'skeu', labelKey: 'theme.skeu', chrome: '#c9ccd1' },
  { id: 'neu', labelKey: 'theme.neu', chrome: '#e0e5ec' },
];
const CONN_FIELDS = ['isp', 'ip', 'ipv4', 'ipv6', 'mac', 'location', 'testServer', 'networkType'];
const GAUGE_STOPS = [0, 5, 10, 25, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000];

const store = {
  get(key) {
    try {
      return localStorage.getItem('thakurg-proto-' + key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('thakurg-proto-' + key, value);
    } catch {
      /* private mode: the prototype still works, it just forgets */
    }
  },
};

function defaultSettings() {
  const features = {};
  FEATURES.forEach((f) => (features[f.id] = true));
  const fields = {};
  CONN_FIELDS.forEach((f) => (fields[f] = true));
  return {
    features,
    speed: { gaugeStops: GAUGE_STOPS.slice() },
    connection: { enabled: true, fields },
    services: { enabled: true, refreshSeconds: 120, items: SERVICES.map((s) => ({ id: s.id, name: s.name, enabled: true })) },
  };
}

// dashboard: /master's settings are shared by every page of this tab (sessionStorage), like they were shared in the single file.
function loadSettings(kind) {
  try {
    const v = JSON.parse(sessionStorage.getItem('thakurg-proto-' + kind));
    if (v && v.features && v.connection && v.services && v.speed)
      return Object.assign(defaultSettings(), v);
  } catch {
    /* nothing saved yet */
  }
  return defaultSettings();
}

let settingsSnapshot = '';
function persistSettings() {
  const snap = JSON.stringify([S.saved, S.settings]);
  if (snap === settingsSnapshot)
    return;
  settingsSnapshot = snap;
  try {
    sessionStorage.setItem('thakurg-proto-saved', JSON.stringify(S.saved));
    sessionStorage.setItem('thakurg-proto-settings', JSON.stringify(S.settings));
  } catch {
    /* private mode */
  }
}

const S = {
  lang: 'en',
  skin: SKINS.some((s) => s.id === store.get('skin')) ? store.get('skin') : 'glass',
  themeOpen: false,
  route: { path: '/', parts: [], query: {} },
  saved: loadSettings('saved'),
  settings: loadSettings('settings'),
};

// #region Text

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m)) : text);

/** i18n.t(): the page's text in the chosen language, English when a key has no translation. */
function t(key, params) {
  const text = DICT[S.lang][key] ?? DICT.en[key];
  if (text === undefined) {
    console.warn('[proto] missing key', key);
    return key;
  }
  return esc(fill(text, params));
}

/** Raw (not escaped) text, for attributes built by esc() later or for document.title. */
const traw = (key, params) => fill(DICT[S.lang][key] ?? DICT.en[key] ?? key, params);

const pageName = (id) => esc(PAGES[S.lang][id] ?? PAGES.en[id] ?? id);

/** An API message from the Messages table, with {0}, {1} placeholders, in the chosen language. */
function msg(code, ...args) {
  const row = MESSAGES[code];
  const text = row ? row[S.lang] ?? row.en : code;
  return text.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));
}

const langInfo = () => LANGS.find((l) => l.code === S.lang);
const on = (feature) => S.settings.features[feature] !== false;

// #endregion

// #region Router

// dashboard: the SnapKhata landing page (/khata) now has its own top bar and footer, like the app screens.
const BARE = /^\/(HR|khata(\/(app|login|set-pin|unlock))?)(\/|$)/;
const PAGE_FEATURE = [
  [/^\/(hi|ar)?$/, 'page.speed'],
  [/^\/youtube$/, 'page.youtube'],
  [/^\/(creta|creta-add)$/, 'page.creta'],
  [/^\/(nexon|nexon-add)$/, 'page.nexon'],
  [/^\/HR$/, 'page.hr'],
  [/^\/about$/, 'page.about'],
  [/^\/privacy$/, 'page.privacy'],
  [/^\/terms$/, 'page.terms'],
  [/^\/khata(\/|$)/, 'page.khata'],
];
const REDIRECTS = ROUTE_REDIRECTS;

function readRoute() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const [p, q = ''] = raw.split('?');
  let path = p.replace(/\/+$/, '') || '/';
  if (REDIRECTS[path])
    path = REDIRECTS[path];
  const query = Object.fromEntries(new URLSearchParams(q));
  return { path, parts: path.split('/').filter(Boolean), query };
}

function go(path, replace) {
  // dashboard: another page owns the address.
  if (!BRIDGE.owns(path))
    return BRIDGE.leave(path);
  const url = '#' + path;
  if (replace)
    history.replaceState(null, '', url);
  else
    history.pushState(null, '', url);
  route();
}

const link = (path) => '#' + path;

/** Finds the page for the address, runs the guards and draws it. */
function route() {
  const before = S.route.path;
  const next = readRoute();
  // dashboard: an address of another page (typed, or reached with Back): keep this page as it was and hand the address over.
  if (!BRIDGE.owns(next.path)) {
    if (before)
      history.replaceState(null, '', '#' + before);
    return BRIDGE.leave(location.hash.slice(1) || '/');
  }
  S.route = next;
  if (S.route.path !== before) {
    if (typeof stopAllPlayback === 'function')
      stopAllPlayback();
    if (typeof running === 'function' && running())
      stStop(false);
  }
  S.themeOpen = false;
  const path = S.route.path;
  const feature = PAGE_FEATURE.find(([re]) => re.test(path));
  if (feature && !on(feature[1]))
    return go('/disabled', true);
  if (path === '/' || path === '/hi' || path === '/ar')
    setLang(path === '/' ? 'en' : path.slice(1), false);
  else if (path === '/HR')
    setLang('en', false);
  const guard = typeof khataGuard === 'function' ? khataGuard(path) : null;
  if (guard)
    return go(guard, true);
  leavePage();
  render(true);
  BRIDGE.report(location.hash.slice(1) || '/');
}

// #endregion

// #region Rendering

let cleanup = [];
function leavePage() {
  cleanup.forEach((fn) => fn());
  cleanup = [];
}

/** The view for the current route: [html, scope class, seo title key, after-render hook]. */
function view() {
  const p = S.route.path;
  const parts = S.route.parts;
  if (p === '/' || p === '/hi' || p === '/ar')
    return speedPage();
  if (p === '/youtube')
    return ytPage();
  if (p === '/creta' || p === '/nexon')
    return playerPage(parts[0]);
  if (p === '/creta-add' || p === '/nexon-add')
    return addPage(parts[0].replace('-add', ''));
  if (p === '/master')
    return cfgPage();
  if (p === '/about' || p === '/privacy' || p === '/terms')
    return staticPage(parts[0]);
  if (p === '/HR')
    return hrPage();
  if (p === '/offline' || p === '/error')
    return statusPage(parts[0]);
  if (parts[0] === 'khata')
    return khataView(parts);
  return statusPage('404');
}

function render(scrollTop) {
  const active = document.activeElement;
  const focusId = active && active.id ? active.id : null;
  const caret = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  leavePage();
  const bare = BARE.test(S.route.path);
  const v = view();
  document.documentElement.lang = S.lang;
  document.documentElement.dir = langInfo().dir;
  document.documentElement.setAttribute('data-skin', S.skin);
  document.querySelector('meta[name=theme-color]').content = SKINS.find((s) => s.id === S.skin).chrome;
  document.title = v.title;
  document.getElementById('app').innerHTML =
    (bare ? '' : `<a class="skip" href="#main" data-act="skip">${t('a11y.skip')}</a>` + headerHtml()) +
    `<main id="main" tabindex="-1" class="${bare ? 'bare' : ''}">${v.html}</main>` +
    (bare ? '' : footerHtml()) +
    demoMenuHtml();
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      if (caret && el.setSelectionRange)
        try {
          el.setSelectionRange(caret[0], caret[1]);
        } catch {
          /* inputs such as type=email have no caret */
        }
    }
  }
  if (v.after)
    v.after();
  if (scrollTop)
    window.scrollTo(0, 0);
  persistSettings();
  measureFooter();
}

// Prototype: the footer is fixed to the bottom; the page keeps exactly its height free below the content (it changes with the language and the width).
function measureFooter() {
  const foot = document.querySelector('.sc-footer .foot');
  if (foot)
    document.documentElement.style.setProperty('--foot-h', foot.offsetHeight + 'px');
}
window.addEventListener('resize', measureFooter);

/** Wraps a page in its component host element, like Angular's emulated encapsulation does. */
const host = (cls, html) => `<div class="ng-host ${cls}">${html}</div>`;

// #endregion

// #region Events

const ACT = {};
const SUBMIT = {};
const CHANGE = {};
const INPUT = {};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el && !el.disabled) {
    const fn = ACT[el.dataset.act];
    if (fn) {
      ev.preventDefault();
      fn(el, ev);
    }
  }
  if (S.themeOpen && !ev.target.closest('.menu')) {
    S.themeOpen = false;
    render();
  }
});
document.addEventListener('submit', (ev) => {
  const fn = SUBMIT[ev.target.dataset.submit];
  if (fn) {
    ev.preventDefault();
    fn(ev.target, new FormData(ev.target));
  }
});
document.addEventListener('change', (ev) => {
  const fn = CHANGE[ev.target.dataset.change];
  if (fn)
    fn(ev.target, ev);
});
document.addEventListener('input', (ev) => {
  const fn = INPUT[ev.target.dataset.input];
  if (fn)
    fn(ev.target, ev);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && S.themeOpen) {
    S.themeOpen = false;
    render();
  }
  if (typeof keypadKey === 'function')
    keypadKey(ev);
});
window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);

ACT.skip = () => document.getElementById('main').focus();

// dashboard: a link to an address that another page owns goes through the dashboard (or straight to that file), not through this page's history.
document.addEventListener('click', (ev) => {
  const a = ev.target.closest && ev.target.closest('a[href^="#/"]');
  if (!a || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey)
    return;
  const path = a.getAttribute('href').slice(1);
  if (BRIDGE.owns(path))
    return;
  ev.preventDefault();
  BRIDGE.leave(path);
}, true);

// dashboard: the sidebar asks for another address of this same page.
BRIDGE.on('goto', (d) => go(d.path));

// dashboard: language, skin or light / dark changed in the dashboard (or in another page).
PREFS.onChange((p) => {
  S.skin = p.skin;
  if (typeof K !== 'undefined' && typeof applyTheme === 'function' && K.theme !== p.mode) {
    K.theme = p.mode;
    applyTheme(true);
  }
  if (p.lang !== S.lang)
    return CHANGE.siteLang({ value: p.lang });
  render();
});

function setLang(code, redraw = true) {
  S.lang = code;
  store.set('lang', code);
  PREFS.announce();
  if (redraw)
    render();
}

// #endregion

// #region Header and footer

const onSpeedRoute = () => /^\/(hi|ar)?$/.test(S.route.path);
const ICON_GAUGE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>';
const ICON_PALETTE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.6.8.3 3.7-2.5 3.7z"/></svg>';

function langSelect(id, act) {
  return `<select id="${id}" class="btn sm" data-change="${act}">${LANGS.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.native}</option>`).join('')}</select>`;
}

function headerHtml() {
  const home = link(langInfo().home);
  const speed = onSpeedRoute();
  let left = '';
  if (speed) {
    left = `<a class="brand" href="${home}" aria-label="${t('brand.name')}">
        <span class="brand-mark" aria-hidden="true">${ICON_GAUGE}</span>
        <span class="brand-text"><b>${t('brand.name')}</b><small>${t('brand.sub')}</small></span>
      </a>`;
    if (on('site.nav')) {
      left += `<nav class="nav" aria-label="${t('nav.main')}">
        <a href="${home}" class="on" aria-current="page">${pageName('speed')}</a>
        ${S.settings.connection.enabled ? `<a href="#" data-act="jump" data-to="connection-details">${pageName('connection')}</a>` : ''}
        ${S.settings.services.enabled ? `<a href="#" data-act="jump" data-to="services-status">${pageName('services')}</a>` : ''}
      </nav>`;
    }
  }
  let tools = '';
  if (on('site.theme')) {
    tools += `<div class="menu">
        <button type="button" class="btn sm icon${S.themeOpen ? ' is-on' : ''}" aria-haspopup="true" aria-expanded="${S.themeOpen}" aria-controls="theme-menu" aria-label="${t('theme.label')}" data-act="theme">${ICON_PALETTE}</button>
        ${S.themeOpen ? `<div class="pop card" id="theme-menu" role="group" aria-label="${t('theme.label')}">${SKINS.map((s) => `<button type="button" class="skin-opt${S.skin === s.id ? ' on' : ''}" aria-pressed="${S.skin === s.id}" data-act="skin" data-id="${s.id}"><span class="swatch" data-skin="${s.id}" aria-hidden="true"></span><span>${t(s.labelKey)}</span></button>`).join('')}</div>` : ''}
      </div>`;
  }
  if (on('site.language'))
    tools += `<label class="lang"><span class="sr-only">${t('lang.label')}</span>${langSelect('site-lang', 'siteLang')}</label>`;
  return host('sc-header', `<header class="bar"><div class="wrap bar-in">${left}<div class="tools${speed ? '' : ' solo'}">${tools}</div></div></header>`);
}

function footerHtml() {
  let links = '';
  if (on('site.footer')) {
    if (on('page.about'))
      links += `<a href="${link('/about')}">${pageName('about')}</a>`;
    if (on('page.privacy'))
      links += `<a href="${link('/privacy')}">${pageName('privacy')}</a>`;
    if (on('page.terms'))
      links += `<a href="${link('/terms')}">${pageName('terms')}</a>`;
  }
  return host('sc-footer', `<footer class="foot"><div class="wrap foot-in"><nav class="links" aria-label="${t('nav.pages')}">${links}</nav><p>&copy; ${new Date().getFullYear()} thakurg.com. ${t('ft.rights')}</p></div></footer>`);
}

ACT.theme = () => {
  S.themeOpen = !S.themeOpen;
  render();
};
ACT.skin = (el) => {
  S.skin = el.dataset.id;
  S.themeOpen = false;
  store.set('skin', S.skin);
  PREFS.announce();
  render();
};
ACT.jump = (el) => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth' });
CHANGE.siteLang = (el) => {
  // The speed test pages take their language from the address; every other page just switches.
  if (onSpeedRoute())
    go(LANGS.find((l) => l.code === el.value).home);
  else
    setLang(el.value);
};

// #endregion

// #region Prototype menu (not part of the real site: it lists every page so the demo can reach them all)

const DEMO_LINKS = [
  ['Speed test', '/'], ['Speed test (Hindi)', '/hi'], ['Speed test (Arabic)', '/ar'], ['YouTube', '/youtube'],
  ['Creta audio', '/creta'], ['Creta: add songs', '/creta-add'], ['Nexon audio', '/nexon'], ['Nexon: add songs', '/nexon-add'],
  ['Atrium HR', '/HR'], ['SnapKhata (public page)', '/khata'], ['SnapKhata app', '/khata/app'], ['SnapKhata login', '/khata/login'],
  ['Settings (/master)', '/master'], ['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms'],
  ['Page not found', '/404'], ['Something went wrong', '/error'], ['You are offline', '/offline'],
];
let demoOpen = false;
function demoMenuHtml() {
  return `<nav class="proto-menu${demoOpen ? ' open' : ''}" aria-label="Prototype pages" dir="ltr">
    <button type="button" class="btn sm pri" aria-expanded="${demoOpen}" data-act="demoMenu">Prototype pages</button>
    ${demoOpen ? `<div class="card proto-list">${DEMO_LINKS.map(([n, p]) => `<a href="${link(p)}"${S.route.path === p ? ' aria-current="page"' : ''}>${esc(n)}<small>${esc(p)}</small></a>`).join('')}</div>` : ''}
  </nav>`;
}
ACT.demoMenu = () => {
  demoOpen = !demoOpen;
  document.querySelector('.proto-menu').outerHTML = demoMenuHtml();
};
window.addEventListener('hashchange', () => (demoOpen = false));

// #endregion

// #region Small helpers

const fmtMbps = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
const fmtSpeed = (mbps) => (mbps >= 10000 ? (mbps / 1000).toFixed(1) : mbps >= 1000 ? (mbps / 1000).toFixed(2) : fmtMbps(mbps));
const speedUnitKey = (mbps) => (mbps >= 1000 ? 'unit.gbps' : 'unit.mbps');
const clockTime = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const rand = (a, b) => a + Math.random() * (b - a);
const timeText = (at) => new Date(at).toLocaleTimeString(langInfo().locale, { hour: '2-digit', minute: '2-digit' });

/** Coloured cover art for demo songs and videos (an SVG data URL). */
function artUrl(seed, w, h, label) {
  const hue = (seed * 67) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},70%,30%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="rgba(255,255,255,.18)"/><text x="50%" y="54%" font-family="sans-serif" font-size="${Math.min(w, h) / 5}" font-weight="700" fill="rgba(255,255,255,.9)" text-anchor="middle" dominant-baseline="middle">${esc(label || '')}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// #endregion


// Start: the saved language applies to every page except the speed test pages, which take it from the address.
// Runs after every script of the page has loaded, so the page's own views and state are defined.
function boot() {
  const saved = store.get('lang');
  if (saved && LANGS.some((l) => l.code === saved))
    S.lang = saved;
  if (typeof kLoad === 'function')
    kLoad();
  S.route = { path: '', parts: [], query: {} };
  if (!location.hash.startsWith('#/'))
    history.replaceState(null, '', '#' + routeHome(routeById(window.PAGE_ID), 'en'));
  route();
}

document.addEventListener('DOMContentLoaded', boot);
