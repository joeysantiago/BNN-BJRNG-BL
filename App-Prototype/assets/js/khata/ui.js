/* SnapKhata: Theme, icons and small parts. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Theme, icons and small parts

const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const resolvedTheme = () => (K.theme === 'system' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : K.theme);
const themeIcon = () => ({ light: 'sun', dark: 'moon', system: 'monitor' })[K.theme];

/** Changes the theme on the page that is already drawn, so colours fade across instead of jumping. */
function applyTheme(animate) {
  const kt = resolvedTheme();
  document.querySelector('meta[name=theme-color]').content = kt === 'dark' ? '#0e0b19' : '#eef1f7';
  const root = document.querySelector('.khata');
  if (!root)
    return;
  if (animate) {
    root.classList.add('k-theming');
    clearTimeout(applyTheme.timer);
    applyTheme.timer = setTimeout(() => root.classList.remove('k-theming'), 450);
  }
  root.setAttribute('data-kt', kt);
  document.querySelectorAll('[data-act=kTheme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === K.theme)));
  document.querySelectorAll('[data-act=kThemeCycle]').forEach((b) => {
    b.innerHTML = ico(themeIcon());
    b.setAttribute('aria-label', traw('khata.theme.toggle', { name: traw('khata.theme.' + K.theme) }));
    b.title = b.getAttribute('aria-label');
  });
}

function setTheme(mode) {
  K.theme = mode;
  store.set(KTHEME, mode);
  PREFS.announce();
  applyTheme(true);
}

if (darkQuery && darkQuery.addEventListener)
  darkQuery.addEventListener('change', () => K.theme === 'system' && applyTheme(true));

ACT.kTheme = (el) => setTheme(el.dataset.mode);
ACT.kThemeCycle = () => setTheme(THEMES[(THEMES.indexOf(K.theme) + 1) % THEMES.length]);

const KI = {
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  next: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  gave: '<path d="M7 17 17 7M8 7h9v9"/>',
  got: '<path d="M17 7 7 17M16 17H7V8"/>',
  sort: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10 10 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  swap: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  store: '<path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
  truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
};
const FLIP = new Set(['back', 'next', 'chev', 'chevL']);
const ico = (name, size = 20, sw = 2) => `<svg class="k-ico${FLIP.has(name) ? ' k-flip' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KI[name]}</svg>`;
const LOGO = '<svg class="k-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"/><path d="M9.5 9.5h6M9.5 13.5h4"/></svg>';

function initials(name) {
  const words = String(name).trim().split(/\s+/);
  return esc(((words[0] ?? '')[0] ?? '?') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

function avatar(name, size = '') {
  let h = 0;
  for (const ch of String(name))
    h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="k-av a${(h % 6) + 1}${size ? ' ' + size : ''}" aria-hidden="true">${initials(name)}</span>`;
}

const errBox = (text) => (text ? `<p class="k-err" role="alert">${ico('alert', 18)}<span>${esc(text)}</span></p>` : '');
const okBox = (text) => (text ? `<p class="k-okmsg" role="status">${ico('check', 18)}<span>${esc(text)}</span></p>` : '');
const balTone = (bal) => (bal > 0 ? 'k-get' : bal < 0 ? 'k-give' : '');

function statusBadge(bal, hasEntries) {
  if (bal > 0)
    return `<span class="k-badge warn"><span class="dot"></span>${t('khata.s.toCollect')}</span>`;
  if (bal < 0)
    return `<span class="k-badge warn"><span class="dot"></span>${t('khata.s.toPay')}</span>`;
  return hasEntries ? `<span class="k-badge get">${ico('check', 12, 3)}${t('khata.s.paid')}</span>` : `<span class="k-badge">${t('khata.s.new')}</span>`;
}

const typeBadge = (type) => (type === GAVE ? `<span class="k-badge give">${ico('gave', 12, 2.6)}${t('khata.e.gave')}</span>` : `<span class="k-badge get">${ico('got', 12, 2.6)}${t('khata.e.got')}</span>`);

function kToast(text) {
  const id = Date.now();
  K.toast = { text, id };
  setTimeout(() => {
    if (K.toast && K.toast.id === id) {
      K.toast = null;
      document.querySelector('.k-toast')?.remove();
    }
  }, 2800);
}

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Big numbers count up from zero the first time a screen opens. */
function countUp() {
  if (reduceMotion())
    return;
  document.querySelectorAll('.khata [data-count]').forEach((el) => {
    const target = +el.dataset.count;
    const cur = K.currencies.find((c) => c.id === +el.dataset.cur);
    if (!cur || !target)
      return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 900);
      el.textContent = money(Math.round(target * (1 - Math.pow(1 - p, 3))), cur);
      if (p < 1 && el.isConnected)
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** Chart tooltips: one box per chart, shown on hover and on keyboard focus of each hit area. */
function bindTips() {
  document.querySelectorAll('.khata .k-chart').forEach((wrap) => {
    const tip = wrap.querySelector('.k-tip');
    const svg = wrap.querySelector('svg');
    if (!tip || !svg)
      return;
    const show = (el) => {
      const d = JSON.parse(el.dataset.tip);
      tip.innerHTML = `<b>${esc(d.t)}</b>${d.rows.map(([cls, label, value]) => `<span><i style="background:var(--k-chart-${cls})"></i>${esc(label)}<em>${esc(value)}</em></span>`).join('')}`;
      const scale = svg.getBoundingClientRect().width / +svg.dataset.w;
      const x = (+el.dataset.x) * scale;
      tip.style.left = Math.min(Math.max(x, 84), wrap.clientWidth - 84) + 'px';
      tip.style.top = Math.max(+el.dataset.y * scale, 40) + 'px';
      tip.hidden = false;
    };
    const hide = () => (tip.hidden = true);
    wrap.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('pointerenter', () => show(el));
      el.addEventListener('focus', () => show(el));
      el.addEventListener('pointerleave', hide);
      el.addEventListener('blur', hide);
    });
  });
}

/** Drag-and-drop of bill photos onto the upload area (desktop). */
function bindDrop() {
  const drop = document.querySelector('.khata .k-drop');
  if (!drop)
    return;
  ['dragenter', 'dragover'].forEach((n) => drop.addEventListener(n, (ev) => {
    ev.preventDefault();
    drop.classList.add('over');
  }));
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (ev) => {
    ev.preventDefault();
    drop.classList.remove('over');
    if (ev.dataTransfer && ev.dataTransfer.files.length)
      addPhotos([...ev.dataTransfer.files]);
  });
}

// #endregion

