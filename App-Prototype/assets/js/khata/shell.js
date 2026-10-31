/* SnapKhata: App shell, PIN sheet, photo viewer and toast. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region App shell, PIN sheet, photo viewer and toast

/** Which bottom tab / side link is lit for the current address. */
function section() {
  const p = S.route.parts;
  if (p[2] === 'books')
    return 'books';
  if (p[2] === 'profile')
    return 'profile';
  if (p[2] !== 'b')
    return '';
  if (p.length === 4)
    return 'home';
  if (p[4] === 'parties' || p[4] === 'contact')
    return 'parties';
  if (p[4] === 'entries' || p[4] === 'e')
    return 'entries';
  return '';
}

function shell(inner) {
  const book = K.books.find((b) => b.id === K.bookId) ?? K.books[0];
  const bid = book ? book.id : 0;
  const here = section();
  const contactQ = S.route.parts[4] === 'contact' ? `?contact=${S.route.parts[5]}` : '';
  const nav = [
    ['home', book ? `/khata/app/b/${bid}` : '/khata/app', 'khata.nav.home', 'home'],
    ['parties', `/khata/app/b/${bid}/parties`, 'khata.nav.parties', 'users'],
    ['entries', `/khata/app/b/${bid}/entries`, 'khata.nav.entries', 'list'],
    ['books', '/khata/app/books', 'khata.nav.books', 'book'],
    ['profile', '/khata/app/profile', 'khata.nav.profile', 'user'],
  ].filter(([id]) => book || id === 'books' || id === 'profile' || id === 'home');
  const cur = (id) => (here === id ? ' aria-current="page"' : '');
  const picker = K.books.length
    ? `<label class="k-bookpick"><span class="sr-only">${t('khata.app.book')}</span><select data-change="kSwitch">${K.books.map((b) => `<option value="${b.id}"${b.id === bid ? ' selected' : ''}>${esc(b.name)} · ${esc(curOf(b).symbol)}</option>`).join('')}<option value="books">${t('khata.app.manageBooks')}</option></select>${ico('chevD', 18)}</label>`
    : '';
  const rail = `<aside class="k-rail" aria-label="${t('khata.app.menu')}"><a class="k-logo" href="${link('/khata/app')}"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></a>
      ${picker}
      ${book ? `<a class="k-btn pri k-new" href="${link(`/khata/app/b/${bid}/new${contactQ}`)}">${ico('plus', 18)}${t('khata.nav.newEntry')}</a>` : ''}
      <nav>${nav.map(([id, href, key, icon]) => `<a class="k-nav" href="${link(href)}"${cur(id)}>${ico(icon)}${t(key)}</a>`).join('')}</nav>
      <span class="grow"></span>
      <div class="foot"><div class="k-seg" role="group" aria-label="${t('khata.theme.label')}">${THEMES.map((m) => `<button type="button" data-act="kTheme" data-mode="${m}" aria-pressed="${K.theme === m}" title="${t('khata.theme.' + m)}" aria-label="${t('khata.theme.' + m)}">${ico({ light: 'sun', dark: 'moon', system: 'monitor' }[m], 17)}</button>`).join('')}</div>
        <a class="k-who" href="${link('/khata/app/profile')}">${avatar(K.identifier || 'S')}<span><b>${t('khata.p.title')}</b><small>${esc(K.identifier)}</small></span></a></div></aside>`;
  const top = `<header class="k-top"><a class="k-logo" href="${link('/khata/app')}" aria-label="${t('khata.app.name')}"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></a>${picker}
      <span class="crumb">${esc(inner.title)}</span>
      <div class="k-top-actions">${themeButton()}<button type="button" class="k-btn ghost icon" data-act="kLock" aria-label="${t('khata.app.lock')}" title="${t('khata.app.lock')}">${ico('lock')}</button></div></header>`;
  const tab = (id, href, key, icon) => `<a class="k-tab" href="${link(href)}"${cur(id)}>${ico(icon, 22)}<span>${t(key)}</span></a>`;
  const tabs = book
    ? `<nav class="k-tabs" aria-label="${t('khata.app.menu')}">${tab('home', `/khata/app/b/${bid}`, 'khata.nav.home', 'home')}${tab('parties', `/khata/app/b/${bid}/parties`, 'khata.nav.parties', 'users')}
        <a class="k-fab" href="${link(`/khata/app/b/${bid}/new${contactQ}`)}" aria-label="${t('khata.nav.newEntry')}">${ico('plus', 26, 2.6)}</a>
        ${tab('entries', `/khata/app/b/${bid}/entries`, 'khata.nav.entries', 'list')}${tab('profile', '/khata/app/profile', 'khata.nav.profile', 'user')}</nav>`
    : '';
  const sheet = K.sheet
    ? `<h2 id="sheet-h">${esc(K.sheet.title)}</h2><p class="k-muted">${t('khata.pin.sheetLead')}</p>${keypadHtml(K.sheetPin, 'kSheetKey', !!K.sheetError)}
      ${errBox(K.sheetError)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><button type="button" class="k-btn" data-act="kSheetCancel">${t('khata.cancel')}</button><button type="button" class="k-btn pri"${K.sheetPin.length < MIN_PIN ? ' disabled' : ''} data-act="kSheetOk">${t('khata.pin.ok')}</button></div>`
    : '';
  const html = `<div class="khata" data-kt="${resolvedTheme()}" dir="${langInfo().dir}"><div class="k-app">${rail}
      <div class="k-mainwrap">${top}<div class="k-content${K.anim ? ' k-enter' : ''}">${inner.html}</div></div>${tabs}</div>
    <dialog id="k-sheet" class="k-sheet" aria-labelledby="sheet-h">${sheet}</dialog>
    <dialog id="k-viewer" class="k-viewer" aria-label="${t('khata.ph.viewer')}">${viewerHtml()}</dialog>
    ${K.toast ? `<div class="k-toast" role="status"><div>${ico('check', 18)}${esc(K.toast.text)}</div></div>` : ''}</div>`;
  return {
    title: inner.title,
    html: host('sc-kshell', html),
    after() {
      const dlg = document.getElementById('k-sheet');
      if (K.sheet && !dlg.open)
        dlg.showModal();
      dlg.addEventListener('cancel', (ev) => {
        ev.preventDefault();
        ACT.kSheetCancel();
      });
      const viewer = document.getElementById('k-viewer');
      if (K.viewer && !viewer.open)
        viewer.showModal();
      viewer.addEventListener('cancel', (ev) => {
        ev.preventDefault();
        ACT.kViewClose();
      });
      bindSwipe(viewer);
      hydratePhotos();
      applyTheme(false);
      if (K.anim && !K.ui.loading) {
        countUp();
        K.anim = false;
      }
      bindTips();
      bindDrop();
      if (inner.after)
        inner.after();
      kSave();
    },
  };
}

CHANGE.kSwitch = (el) => go(el.value === 'books' ? '/khata/app/books' : `/khata/app/b/${el.value}`);

/** Risky actions (edit, delete, sharing control, PIN change) ask for the PIN first in a sheet over the screen. */
function askPin(title, action) {
  K.sheet = { title, action };
  K.sheetPin = '';
  K.sheetError = '';
  render();
}

ACT.kSheetKey = (el) => {
  K.sheetPin = pressKey(K.sheetPin, el.dataset.d);
  K.sheetError = '';
  render();
};
ACT.kSheetCancel = () => {
  K.sheet = null;
  render();
};
ACT.kSheetOk = () => {
  if (K.sheetPin.length < MIN_PIN)
    return;
  if (K.sheetPin !== K.pin) {
    K.pinTries--;
    K.sheetPin = '';
    if (K.pinTries <= 0) {
      logout();
      return;
    }
    K.sheetError = msg('KHATA_PIN_INVALID', K.pinTries);
    return render();
  }
  K.pinTries = 5;
  const action = K.sheet.action;
  K.sheet = null;
  action();
  render();
};

/** Full-screen photo viewer: arrows, swipe, Escape and a download link. */
function viewerHtml() {
  const v = K.viewer;
  if (!v)
    return '';
  const item = v.items[v.i];
  const src = item.url ? ` src="${esc(item.url)}"` : '';
  const many = v.items.length > 1;
  return `<div class="bar"><span>${t('khata.ph.count', { n: v.i + 1, total: v.items.length })}</span><span style="display:flex;gap:8px">
      ${item.url ? `<a class="k-btn icon" href="${esc(item.url)}" download="${esc(item.name || 'bill.webp')}" aria-label="${t('khata.ph.download')}" title="${t('khata.ph.download')}">${ico('download')}</a>` : ''}
      <button type="button" class="k-btn icon" data-act="kViewClose" aria-label="${t('khata.close')}" title="${t('khata.close')}">${ico('x')}</button></span></div>
    <div class="stage"><img${src}${item.id && !item.url ? ` data-photo="${esc(item.id)}"` : ''} alt="${t('khata.ph.alt', { n: v.i + 1 })}" /></div>
    ${many ? `<button type="button" class="k-btn icon nav prev" data-act="kViewStep" data-d="-1" aria-label="${t('khata.ph.prev')}">${ico('chevL', 24)}</button><button type="button" class="k-btn icon nav next" data-act="kViewStep" data-d="1" aria-label="${t('khata.ph.next')}">${ico('chev', 24)}</button>
      <div class="dots" aria-hidden="true">${v.items.map((_, i) => `<i class="${i === v.i ? 'on' : ''}"></i>`).join('')}</div>` : ''}`;
}

function openViewer(items, i) {
  K.viewer = { items, i };
  render();
  // The stored photo's address is ready once hydrated; give the download link the same address.
  const it = items[i];
  if (it.id && !it.url)
    photoUrl(it.id).then((u) => {
      if (u && K.viewer && K.viewer.items[K.viewer.i] === it) {
        it.url = u;
        render();
      }
    });
}

ACT.kViewClose = () => {
  K.viewer = null;
  render();
};
ACT.kViewStep = (el) => {
  const v = K.viewer;
  if (!v)
    return;
  v.i = (v.i + +el.dataset.d + v.items.length) % v.items.length;
  openViewer(v.items, v.i);
};

function bindSwipe(viewer) {
  let x0 = null;
  viewer.addEventListener('pointerdown', (ev) => (x0 = ev.clientX));
  viewer.addEventListener('pointerup', (ev) => {
    if (x0 === null || !K.viewer || K.viewer.items.length < 2)
      return;
    const dx = ev.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50)
      ACT.kViewStep({ dataset: { d: (dx < 0) !== (langInfo().dir === 'rtl') ? '1' : '-1' } });
  });
}

function notFound(code) {
  return {
    title: traw('khata.app.name'),
    html: `<div class="k-card k-empty">${emptyArt('search')}<h1 style="font-size:20px">${t('khata.nf.title')}</h1><p>${esc(msg(code) === code ? traw('khata.nf.lead') : msg(code))}</p><a class="k-btn pri" href="${link('/khata/app')}">${ico('home', 18)}${t('khata.nf.home')}</a></div>`,
  };
}

/** Small line drawings for empty states, coloured by the theme. */
function emptyArt(kind) {
  const glyph = { users: KI.users, list: KI.list, search: KI.search, image: KI.image, book: KI.book }[kind] ?? KI.list;
  return `<svg class="art" viewBox="0 0 140 110" aria-hidden="true"><ellipse cx="70" cy="98" rx="46" ry="6" fill="var(--k-line)"/><rect x="26" y="14" width="88" height="74" rx="20" fill="var(--k-surface-solid)" stroke="var(--k-line-strong)"/>
    <circle cx="112" cy="20" r="10" fill="var(--k-brand-soft)"/><circle cx="24" cy="78" r="7" fill="var(--k-brand-soft)"/>
    <g transform="translate(46 27) scale(2)" fill="none" stroke="var(--k-brand)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
}

// #endregion

