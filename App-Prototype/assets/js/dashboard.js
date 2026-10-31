/* Master dashboard: builds the sidebar from ROUTES, shows the chosen page in the content frame, and owns the language and theme controls.
   The dashboard's address mirrors the page's (index.html#/khata/app), so refresh, Back and shared links land on the same page. */
'use strict';

const TEXT = {
  en: { sub: 'Prototype dashboard', lang: 'Language', theme: 'Theme', mode: 'Mode', light: 'Light', dark: 'Dark', system: 'System default', skin: 'Site skin', skinHelp: 'Used by the website pages (speed test, players, YouTube, settings).', collapse: 'Collapse menu', expand: 'Expand menu', open: 'Open menu', close: 'Close menu', standalone: 'Open this page on its own in a new tab', nav: 'Features', frame: 'Feature page', skip: 'Skip to content', glass: 'Glassmorphism', clay: 'Claymorphism', skeu: 'Skeuomorphism', neu: 'Neumorphism' },
  hi: { sub: 'प्रोटोटाइप डैशबोर्ड', lang: 'भाषा', theme: 'थीम', mode: 'मोड', light: 'लाइट', dark: 'डार्क', system: 'सिस्टम डिफ़ॉल्ट', skin: 'साइट स्किन', skinHelp: 'वेबसाइट पेजों (स्पीड टेस्ट, प्लेयर, यूट्यूब, सेटिंग्स) पर लागू।', collapse: 'मेनू छोटा करें', expand: 'मेनू बड़ा करें', open: 'मेनू खोलें', close: 'मेनू बंद करें', standalone: 'इस पेज को नए टैब में अलग से खोलें', nav: 'सुविधाएँ', frame: 'सुविधा पेज', skip: 'सामग्री पर जाएँ', glass: 'ग्लासमॉर्फिज़्म', clay: 'क्लेमॉर्फिज़्म', skeu: 'स्कियोमॉर्फिज़्म', neu: 'न्यूमॉर्फिज़्म' },
  ar: { sub: 'لوحة النموذج الأولي', lang: 'اللغة', theme: 'المظهر', mode: 'الوضع', light: 'فاتح', dark: 'داكن', system: 'حسب النظام', skin: 'نمط الموقع', skinHelp: 'يُستخدم في صفحات الموقع (اختبار السرعة والمشغلات ويوتيوب والإعدادات).', collapse: 'تصغير القائمة', expand: 'توسيع القائمة', open: 'فتح القائمة', close: 'إغلاق القائمة', standalone: 'فتح هذه الصفحة وحدها في علامة تبويب جديدة', nav: 'الميزات', frame: 'صفحة الميزة', skip: 'تخطَّ إلى المحتوى', glass: 'زجاجي (Glassmorphism)', clay: 'طيني (Claymorphism)', skeu: 'واقعي (Skeuomorphism)', neu: 'ناعم (Neumorphism)' },
};

const ICONS = {
  gauge: '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  play: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 17H7a3 3 0 0 0-3 3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  alert: '<path d="M12 3l10 18H2zM12 10v4M12 17h.01"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  collapse: '<path d="M15 6l-6 6 6 6"/><path d="M4 4v16"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (id) => document.getElementById(id);

const DASH = {
  path: '/',
  file: null,
  title: '',
  themeOpen: false,
  drawer: false,
};

const tx = (key) => (TEXT[PREFS.get().lang] || TEXT.en)[key];
const label = (obj) => obj[PREFS.get().lang] || obj.en;

// #region Rendering

function renderNav() {
  const lang = PREFS.get().lang;
  const current = routeFor(DASH.path);
  const here = cleanPath(DASH.path);
  $('dash-nav').setAttribute('aria-label', tx('nav'));
  $('dash-nav').innerHTML = ROUTE_GROUPS.map((g) => {
    const items = ROUTES.filter((r) => r.group === g.id).map((r) => {
      const on = r.id === current.id;
      const home = routeHome(r, lang);
      const subs = on && r.links ? `<ul class="sub">${r.links.map((l) => `<li><a href="#${l.path}" data-path="${l.path}"${here === l.path ? ' aria-current="page"' : ''}>${escHtml(label(l.label))}</a></li>`).join('')}</ul>` : '';
      return `<li><a class="nav-item" href="#${home}" data-path="${home}" title="${escHtml(label(r.label))}"${on ? ' aria-current="page"' : ''}>${ic(r.icon)}<span>${escHtml(label(r.label))}</span></a>${subs}</li>`;
    });
    return `<section class="nav-grp" aria-labelledby="ng-${g.id}"><h2 id="ng-${g.id}">${escHtml(label(g.label))}</h2><ul>${items.join('')}</ul></section>`;
  }).join('');
}

function renderHeader() {
  const p = PREFS.get();
  const lang = PREFS.LANGS.find((l) => l.code === p.lang);
  const root = document.documentElement;
  root.lang = p.lang;
  root.dir = lang.dir;
  root.setAttribute('data-mode', PREFS.resolved(p.mode));
  document.querySelector('meta[name=theme-color]').content = PREFS.resolved(p.mode) === 'dark' ? '#15121f' : '#ffffff';
  $('brand-sub').textContent = tx('sub');
  document.querySelector('.dash-mark').innerHTML = ic('gauge');
  document.querySelector('.skip').textContent = tx('skip');
  $('content-frame').title = DASH.title || tx('frame');
  $('lang-label').textContent = tx('lang');
  $('lang-ic').innerHTML = ic('globe');
  $('lang-select').innerHTML = PREFS.LANGS.map((l) => `<option value="${l.code}"${l.code === p.lang ? ' selected' : ''}>${l.native}</option>`).join('');
  const modeIcon = { light: 'sun', dark: 'moon', system: 'monitor' }[p.mode];
  $('theme-btn').innerHTML = `${ic(modeIcon)}<span class="lbl">${escHtml(tx(p.mode))}</span>${ic('chevron').replace('class="ic"', 'class="ic chev"')}`;
  $('theme-btn').setAttribute('aria-label', `${tx('theme')}: ${tx(p.mode)}, ${tx(p.skin)}`);
  $('theme-btn').setAttribute('aria-expanded', String(DASH.themeOpen));
  const pop = $('theme-pop');
  pop.hidden = !DASH.themeOpen;
  pop.setAttribute('aria-label', tx('theme'));
  pop.innerHTML = `<div class="grp" role="radiogroup" aria-labelledby="tp-mode"><h2 id="tp-mode">${escHtml(tx('mode'))}</h2>
      ${['light', 'dark', 'system'].map((m) => `<button type="button" class="opt" role="radio" aria-checked="${p.mode === m}" data-mode="${m}">${ic({ light: 'sun', dark: 'moon', system: 'monitor' }[m])}<span>${escHtml(tx(m))}</span>${ic('check').replace('class="ic"', 'class="ic tick"')}</button>`).join('')}</div>
    <div class="grp" role="radiogroup" aria-labelledby="tp-skin"><h2 id="tp-skin">${escHtml(tx('skin'))}</h2><p>${escHtml(tx('skinHelp'))}</p>
      ${['glass', 'clay', 'skeu', 'neu'].map((s) => `<button type="button" class="opt" role="radio" aria-checked="${p.skin === s}" data-skin="${s}"><span class="swatch" data-skin="${s}" aria-hidden="true"></span><span>${escHtml(tx(s))}</span>${ic('check').replace('class="ic"', 'class="ic tick"')}</button>`).join('')}</div>`;
  const r = routeFor(DASH.path);
  $('crumb').textContent = label(r.label) + (DASH.title && DASH.title !== label(r.label) ? ' · ' + DASH.title : '');
  $('standalone').href = routeUrl(DASH.path, 'pages/');
  $('standalone').innerHTML = ic('external');
  $('standalone').title = tx('standalone');
  $('standalone').setAttribute('aria-label', tx('standalone'));
  const rail = root.classList.contains('rail');
  $('collapse-btn').innerHTML = `${ic('collapse')}<span>${escHtml(tx(rail ? 'expand' : 'collapse'))}</span>`;
  $('collapse-btn').setAttribute('aria-label', tx(rail ? 'expand' : 'collapse'));
  $('collapse-btn').setAttribute('aria-expanded', String(!rail));
  $('menu-btn').innerHTML = ic(DASH.drawer ? 'x' : 'menu');
  $('menu-btn').setAttribute('aria-label', tx(DASH.drawer ? 'close' : 'open'));
  $('menu-btn').setAttribute('aria-expanded', String(DASH.drawer));
  root.classList.toggle('drawer-open', DASH.drawer);
  $('scrim').hidden = !DASH.drawer;
  document.title = `${DASH.title || label(r.label)} · thakurg.com prototype`;
}

function renderAll() {
  renderHeader();
  renderNav();
}

// #endregion

// #region Navigation

/** Shows a dashboard address: the same page file gets a "goto" message, another file is loaded into the frame. */
function openPath(path) {
  const r = routeFor(path);
  const frame = $('content-frame');
  DASH.path = path;
  DASH.title = '';
  if (DASH.file === r.file)
    BRIDGE.post({ type: 'goto', path: routeInner(r, path) });
  else {
    DASH.file = r.file;
    document.documentElement.classList.add('loading');
    frame.src = routeUrl(path, 'pages/');
  }
  history.replaceState(null, '', '#' + path);
  setDrawer(false);
  renderAll();
}

const hashPath = () => (location.hash.startsWith('#/') ? decodeURI(location.hash.slice(1)) : routeHome(routeById('speed'), PREFS.get().lang));

function setDrawer(open) {
  DASH.drawer = open;
  renderHeader();
}

// #endregion

// #region Events

document.addEventListener('click', (ev) => {
  const nav = ev.target.closest('#dash-nav a[data-path]');
  if (nav && ev.button === 0 && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
    ev.preventDefault();
    openPath(nav.dataset.path);
    return;
  }
  if (ev.target.closest('#brand')) {
    ev.preventDefault();
    openPath(routeHome(routeById('speed'), PREFS.get().lang));
    return;
  }
  if (ev.target.closest('[data-act=skip]')) {
    ev.preventDefault();
    $('content-frame').focus();
    return;
  }
  if (ev.target.closest('#theme-btn')) {
    DASH.themeOpen = !DASH.themeOpen;
    renderHeader();
    if (DASH.themeOpen)
      $('theme-pop').querySelector('[aria-checked=true]')?.focus();
    return;
  }
  const opt = ev.target.closest('#theme-pop .opt');
  if (opt) {
    PREFS.set(opt.dataset.mode ? { mode: opt.dataset.mode } : { skin: opt.dataset.skin });
    renderHeader();
    $('theme-pop').querySelector(opt.dataset.mode ? `[data-mode=${opt.dataset.mode}]` : `[data-skin=${opt.dataset.skin}]`)?.focus();
    return;
  }
  if (DASH.themeOpen && !ev.target.closest('#theme-menu')) {
    DASH.themeOpen = false;
    renderHeader();
  }
  if (ev.target.closest('#collapse-btn')) {
    const rail = document.documentElement.classList.toggle('rail');
    try {
      localStorage.setItem('thakurg-proto-sidebar', rail ? 'collapsed' : 'open');
    } catch {
      /* private mode */
    }
    renderHeader();
  }
  if (ev.target.closest('#menu-btn'))
    setDrawer(!DASH.drawer);
  if (ev.target.closest('#scrim'))
    setDrawer(false);
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (DASH.themeOpen) {
      DASH.themeOpen = false;
      renderHeader();
      $('theme-btn').focus();
    } else if (DASH.drawer) {
      setDrawer(false);
      $('menu-btn').focus();
    }
  }
  // Arrow keys move between the options of the theme menu.
  if (DASH.themeOpen && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
    const opts = [...document.querySelectorAll('#theme-pop .opt')];
    const i = opts.indexOf(document.activeElement);
    opts[(i + (ev.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length].focus();
    ev.preventDefault();
  }
});

$('lang-select').addEventListener('change', (ev) => {
  PREFS.set({ lang: ev.target.value });
  renderAll();
});

// The dashboard's own address was changed (typed, or a link to index.html#/...).
window.addEventListener('hashchange', () => {
  const p = hashPath();
  if (cleanPath(p) !== cleanPath(DASH.path))
    openPath(p);
});

$('content-frame').addEventListener('load', () => document.documentElement.classList.remove('loading'));

// Clicks inside the content frame never reach this document; the window losing focus to the frame closes the theme menu and the drawer.
window.addEventListener('blur', () => {
  if (document.activeElement === $('content-frame') && (DASH.themeOpen || DASH.drawer)) {
    DASH.themeOpen = false;
    setDrawer(false);
  }
});

// The page in the frame tells us where it is (its own links, Back, redirects such as the SnapKhata login).
BRIDGE.on('location', (d) => {
  DASH.path = d.path;
  DASH.title = String(d.title || '').replace(/\s·\s(thakurg\.com prototype|SnapTracker)$/, '');
  DASH.file = routeFor(d.path).file;
  document.documentElement.classList.remove('loading');
  history.replaceState(null, '', '#' + d.path);
  renderAll();
});

// The page wants an address that another page owns.
BRIDGE.on('navigate', (d) => openPath(d.path));

// A page changed the language, skin or mode with its own controls, or the device switched light / dark.
PREFS.onChange(() => renderAll());

// #endregion

BRIDGE.attach($('content-frame'));
openPath(hashPath());
