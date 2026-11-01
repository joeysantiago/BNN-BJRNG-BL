/* SnapKhata: Contact settings and profile. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Contact settings and profile

function contactSettingsPage(bookId, contactId) {
  const c = K.contacts.find((x) => x.id === contactId && x.bookId === bookId);
  if (!c)
    return notFound('KHATA_CONTACT_NOT_FOUND');
  const ui = K.ui;
  const errs = ui.errors;
  const html = `<div class="k-set k-stagger" style="margin-inline:auto">
    <a class="k-back" href="${link(`/khata/app/b/${bookId}/contact/${contactId}`)}">${ico('back', 18)}${esc(c.name)}</a>
    <div class="k-head"><div style="display:flex;align-items:center;gap:14px">${avatar(c.name, 'lg')}<div><h1 id="cs-h1">${t('khata.cs.title')}</h1><p>${esc(c.name)}</p></div></div></div>
    ${okBox(ui.info)}${errBox(ui.error)}
    <form class="k-card k-form" data-submit="kContactSave" data-id="${c.id}" novalidate aria-labelledby="cs-d"><div class="k-card-h" style="margin:0"><h2 id="cs-d">${t('khata.cs.details')}</h2></div>
      <div class="k-two"><label class="k-field ico"><span class="lbl">${t('khata.c.name')}</span>${ico('user', 18)}<input name="name" type="text" maxlength="100" required value="${esc(c.name)}" aria-invalid="${!!errs.name}" /></label>
        <label class="k-field"><span class="lbl">${t('khata.c.type')}</span><select name="type"><option value="1"${c.contactType === 1 ? ' selected' : ''}>${t('khata.c.customer')}</option><option value="2"${c.contactType === 2 ? ' selected' : ''}>${t('khata.c.supplier')}</option></select></label>
        <label class="k-field ico"><span class="lbl">${t('khata.c.mobile')}</span>${ico('phone', 18)}<input name="mobile" type="tel" inputmode="tel" value="${esc(c.mobile)}" aria-invalid="${!!errs.mobile}" /></label>
        <label class="k-field ico"><span class="lbl">${t('khata.c.email')}</span>${ico('mail', 18)}<input name="email" type="email" value="${esc(c.email)}" aria-invalid="${!!errs.email}" /></label></div>
      <label class="k-field"><span class="lbl">${t('khata.cs.address')}</span><input name="address" type="text" maxlength="300" value="${esc(c.address)}" /></label>
      <label class="k-field"><span class="lbl">${t('khata.cs.note')}</span><textarea name="note" maxlength="500">${esc(c.note)}</textarea></label>
      <div class="k-actions"><button type="submit" class="k-btn pri">${ico('check', 18)}${t('khata.save')}</button></div></form>
    <section class="k-card" aria-labelledby="cs-share"><div class="k-card-h" style="margin:0"><h2 id="cs-share">${t('khata.cs.sharing')}</h2></div>
      <div class="k-set-row"><span class="t"><span class="k-ib brand">${ico('users', 18)}</span><span><b>${t('khata.cs.allow', { name: c.name })}</b><small>${t('khata.cs.allowHint', { name: c.name })}</small></span></span>
        <span class="k-switch"><input type="checkbox" role="switch"${c.allowContactEntries ? ' checked' : ''} data-change="kAllow" data-id="${c.id}" aria-label="${t('khata.cs.allow', { name: c.name })}" /><span></span></span></div></section>
    <section class="k-card" aria-labelledby="cs-danger" style="border-color:color-mix(in srgb,var(--k-give) 30%,transparent)"><div class="k-set-row"><span class="t"><span class="k-ib give">${ico('trash', 18)}</span><span><b id="cs-danger">${t('khata.cs.delete')}</b><small>${t('khata.cs.deleteHint')}</small></span></span>
      <button type="button" class="k-btn danger sm" data-act="kContactDelete" data-id="${c.id}">${t('khata.books.delete')}</button></div></section>
  </div>`;
  return { title: traw('khata.cs.title'), html };
}

SUBMIT.kContactSave = (form, data) => {
  const c = K.contacts.find((x) => x.id === +form.dataset.id);
  const { fields, errors, ok } = contactFields(data);
  K.ui.info = '';
  K.ui.error = '';
  K.ui.errors = errors;
  if (!ok) {
    K.ui.error = msg('KHATA_CONTACT_INVALID');
    return render();
  }
  Object.assign(c, fields, { address: String(data.get('address')).trim(), note: String(data.get('note')).trim() });
  K.ui.info = traw('khata.cs.saved');
  render();
};
CHANGE.kAllow = (el) => {
  const c = K.contacts.find((x) => x.id === +el.dataset.id);
  c.allowContactEntries = el.checked;
  render();
};
ACT.kContactDelete = (el) => {
  const c = K.contacts.find((x) => x.id === +el.dataset.id);
  confirmAsk(traw('khata.cs.deleteTitle', { name: c.name }), () => {
    K.entries = K.entries.filter((e) => e.contactId !== c.id);
    K.contacts = K.contacts.filter((x) => x !== c);
    kToast(traw('khata.cs.deleted', { name: c.name }));
    setTimeout(() => go(`/khata/app/b/${c.bookId}/parties`, true));
  });
};

/** SnapKhata's profile: the account comes from the common login (name, language and password are changed on /profile), plus appearance, demo data and log out. */
function profilePage() {
  const me = kMe();
  const html = `<div class="k-set k-stagger">
    <div class="k-head"><div><h1 id="profile-h1">${t('khata.p.title')}</h1><p>${t('khata.p.lead')}</p></div></div>
    <section class="k-card" aria-label="${t('khata.p.account')}"><div class="k-set-row"><span class="t">${avatar(me.displayName || 'S', 'lg')}<span><b>${esc(me.displayName)}</b><small>${esc(me.email)} · ${t('khata.p.signedIn')}</small></span></span></div>
      <div class="k-set-row"><span class="t"><span class="k-ib brand">${ico('user', 18)}</span><span><b>${t('khata.p.manage')}</b><small>${t('khata.p.manageHint')}</small></span></span><a class="k-btn sm" href="${link('/profile')}">${t('auth.profile')}</a></div></section>
    <section class="k-card" aria-labelledby="ap-h"><div class="k-card-h"><div><h2 id="ap-h">${t('khata.p.appearance')}</h2><p>${t('khata.p.appearanceLead')}</p></div></div>
      <div class="k-themes" role="group" aria-label="${t('khata.theme.label')}">${THEMES.map((m) => `<button type="button" class="k-theme" data-act="kTheme" data-mode="${m}" aria-pressed="${K.theme === m}"><span class="pv ${m}" aria-hidden="true"><i></i><i></i></span><span class="nm">${ico({ light: 'sun', dark: 'moon', system: 'monitor' }[m], 16)}${t('khata.theme.' + m)}</span></button>`).join('')}</div>
      <div class="k-set-row" style="margin-top:8px"><span class="t"><span class="k-ib brand">${ico('globe', 18)}</span><span><b>${t('khata.p.language')}</b><small>${t('khata.p.languageHint')}</small></span></span>
        <label class="k-field" style="min-width:150px"><span class="sr-only">${t('khata.p.language')}</span><select data-change="kLang">${LANGS.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.native}</option>`).join('')}</select></label></div></section>
    <section class="k-card" aria-labelledby="data-h"><div class="k-card-h" style="margin:0"><h2 id="data-h">${t('khata.p.data')}</h2></div>
      <div class="k-set-row"><span class="t"><span class="k-ib warn">${ico('db', 18)}</span><span><b>${t('khata.p.reset')}</b><small>${t('khata.p.resetHint')}</small></span></span><button type="button" class="k-btn sm danger" data-act="kReset">${t('khata.p.resetBtn')}</button></div>
      <div class="k-set-row"><span class="t"><span class="k-ib give">${ico('logout', 18)}</span><span><b>${t('khata.pin.logout')}</b><small>${t('khata.p.logoutHint')}</small></span></span><button type="button" class="k-btn sm danger" data-act="kLogout">${t('khata.pin.logout')}</button></div></section>
  </div>`;
  return { title: traw('khata.p.title'), html };
}

CHANGE.kLang = (el) => setLang(el.value);

/** Log out of the common login (every app); SnapKhata goes back to its public page. */
ACT.kLogout = () => {
  AUTH.logout();
  K.sheet = null;
  K.viewer = null;
  go('/khata', true);
};
ACT.kReset = () => confirmAsk(traw('khata.p.resetTitle'), () => {
  photoClear();
  Object.assign(K, { seeded: false, nextId: 100, books: [], contacts: [], entries: [], bookId: 0, currencies: CURRENCIES.map((c, i) => ({ id: i + 1, ...c, isIso: true, custom: false })) });
  seed();
  kSave();
  kToast(traw('khata.p.resetDone'));
  go('/khata/app', true);
});

// #endregion
