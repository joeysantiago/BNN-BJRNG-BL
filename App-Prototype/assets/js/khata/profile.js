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
  const want = el.checked;
  el.checked = c.allowContactEntries; // stays as it was until the PIN is confirmed
  askPin(traw('khata.cs.allowTitle', { name: c.name }), () => (c.allowContactEntries = want));
};
ACT.kContactDelete = (el) => {
  const c = K.contacts.find((x) => x.id === +el.dataset.id);
  askPin(traw('khata.cs.deleteTitle', { name: c.name }), () => {
    K.entries = K.entries.filter((e) => e.contactId !== c.id);
    K.contacts = K.contacts.filter((x) => x !== c);
    kToast(traw('khata.cs.deleted', { name: c.name }));
    setTimeout(() => go(`/khata/app/b/${c.bookId}/parties`, true));
  });
};

const pwField = (id, name, label) => `<label class="k-field"><span class="lbl">${label}</span><span class="k-pw" style="display:block"><input id="${id}" name="${name}" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" />
  <button type="button" class="eye" data-act="kEye" data-for="${id}" aria-label="${t('khata.p.show')}" aria-pressed="false">${ico('eye', 18)}</button></span></label>`;

function profilePage() {
  const ui = K.ui;
  const html = `<div class="k-set k-stagger">
    <div class="k-head"><div><h1 id="profile-h1">${t('khata.p.title')}</h1><p>${t('khata.p.lead')}</p></div></div>
    <section class="k-card" aria-label="${t('khata.p.account')}"><div class="k-set-row"><span class="t">${avatar(K.identifier || 'S', 'lg')}<span><b>${esc(K.identifier)}</b><small>${t('khata.p.signedIn')}</small></span></span><span class="k-badge get">${ico('shield', 12)}${t('khata.p.secured')}</span></div></section>
    <section class="k-card" aria-labelledby="ap-h"><div class="k-card-h"><div><h2 id="ap-h">${t('khata.p.appearance')}</h2><p>${t('khata.p.appearanceLead')}</p></div></div>
      <div class="k-themes" role="group" aria-label="${t('khata.theme.label')}">${THEMES.map((m) => `<button type="button" class="k-theme" data-act="kTheme" data-mode="${m}" aria-pressed="${K.theme === m}"><span class="pv ${m}" aria-hidden="true"><i></i><i></i></span><span class="nm">${ico({ light: 'sun', dark: 'moon', system: 'monitor' }[m], 16)}${t('khata.theme.' + m)}</span></button>`).join('')}</div>
      <div class="k-set-row" style="margin-top:8px"><span class="t"><span class="k-ib brand">${ico('globe', 18)}</span><span><b>${t('khata.p.language')}</b><small>${t('khata.p.languageHint')}</small></span></span>
        <label class="k-field" style="min-width:150px"><span class="sr-only">${t('khata.p.language')}</span><select data-change="kLang">${LANGS.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.native}</option>`).join('')}</select></label></div></section>
    <form class="k-card k-form" data-submit="kChangePin" novalidate aria-labelledby="pin-h"><div class="k-card-h" style="margin:0"><div><h2 id="pin-h">${t('khata.p.changePin')}</h2><p>${t('khata.p.pinRule')}</p></div><span class="k-ib brand">${ico('key', 18)}</span></div>
      <div class="k-two">${pwField('k-pin1', 'pin', t('khata.p.newPin'))}${pwField('k-pin2', 'again', t('khata.p.confirmPin'))}</div>
      ${okBox(ui.info)}${errBox(ui.error)}
      <div class="k-actions"><button type="submit" class="k-btn pri">${t('khata.p.changePin')}</button></div></form>
    <section class="k-card" aria-labelledby="data-h"><div class="k-card-h" style="margin:0"><h2 id="data-h">${t('khata.p.data')}</h2></div>
      <div class="k-set-row"><span class="t"><span class="k-ib warn">${ico('db', 18)}</span><span><b>${t('khata.p.reset')}</b><small>${t('khata.p.resetHint')}</small></span></span><button type="button" class="k-btn sm danger" data-act="kReset">${t('khata.p.resetBtn')}</button></div>
      <div class="k-set-row"><span class="t"><span class="k-ib brand">${ico('lock', 18)}</span><span><b>${t('khata.app.lock')}</b><small>${t('khata.p.lockHint')}</small></span></span><button type="button" class="k-btn sm" data-act="kLock">${t('khata.app.lock')}</button></div>
      <div class="k-set-row"><span class="t"><span class="k-ib give">${ico('logout', 18)}</span><span><b>${t('khata.pin.logout')}</b><small>${t('khata.p.logoutHint')}</small></span></span><button type="button" class="k-btn sm danger" data-act="kLogout">${t('khata.pin.logout')}</button></div></section>
  </div>`;
  return { title: traw('khata.p.title'), html };
}

/** Show / hide a PIN field without redrawing the form, so what was typed stays. */
ACT.kEye = (el) => {
  const input = document.getElementById(el.dataset.for);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  el.setAttribute('aria-pressed', String(show));
  el.setAttribute('aria-label', traw(show ? 'khata.p.hide' : 'khata.p.show'));
  el.innerHTML = ico(show ? 'eyeOff' : 'eye', 18);
};
CHANGE.kLang = (el) => setLang(el.value);
SUBMIT.kChangePin = (form, data) => {
  const pin = String(data.get('pin'));
  const again = String(data.get('again'));
  K.ui.info = '';
  K.ui.error = '';
  if (!/^\d{4,6}$/.test(pin)) {
    K.ui.error = traw('khata.p.pinRule');
    return render();
  }
  if (pin !== again) {
    K.ui.error = traw('khata.pin.mismatch');
    return render();
  }
  if (weakPin(pin)) {
    K.ui.error = msg('KHATA_PIN_WEAK', MIN_PIN, 6);
    return render();
  }
  askPin(traw('khata.p.currentPin'), () => {
    K.pin = pin;
    K.ui.info = msg('KHATA_PIN_CHANGED');
  });
};
ACT.kReset = () => askPin(traw('khata.p.resetTitle'), () => {
  photoClear();
  Object.assign(K, { seeded: false, nextId: 100, books: [], contacts: [], entries: [], bookId: 0, currencies: CURRENCIES.map((c, i) => ({ id: i + 1, ...c, isIso: true, custom: false })) });
  seed();
  kSave();
  kToast(traw('khata.p.resetDone'));
  go('/khata/app', true);
});

// #endregion
