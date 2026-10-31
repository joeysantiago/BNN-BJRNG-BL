/* SnapKhata: Parties. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Parties (customers and suppliers)

const chip = (field, value, label, n) => `<button type="button" class="k-chip" data-act="kFilter" data-f="${field}" data-v="${value}" aria-pressed="${K.ui[field] === value}">${label}${n !== undefined ? `<span class="n">${n}</span>` : ''}</button>`;

function partiesPage(bookId) {
  const book = K.books.find((b) => b.id === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  if (S.route.query.add === '1' && !K.ui.adding && !K.ui.addSeen) {
    K.ui.adding = true;
    K.ui.addSeen = true;
  }
  if (K.ui.loading)
    return { title: traw('khata.nav.parties'), html: skeleton('list') };
  const cur = curOf(book);
  const sums = bookSums(book);
  const ui = K.ui;
  const all = bookContacts(bookId);
  const q = ui.query.trim().toLowerCase();
  const rows = all.map((c) => ({ c, bal: contactBalance(c.id), last: lastEntryOn(c.id) }))
    .filter(({ c }) => ui.kind === 'all' || c.contactType === (ui.kind === 'customers' ? 1 : 2))
    .filter(({ bal, last }) => ui.status === 'all' || (ui.status === 'collect' ? bal > 0 : ui.status === 'pay' ? bal < 0 : bal === 0 && !!last))
    .filter(({ c }) => !q || c.name.toLowerCase().includes(q) || (c.mobile ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) || (c.email ?? '').toLowerCase().includes(q));
  const sorters = {
    recent: (a, b) => (b.last ?? '').localeCompare(a.last ?? ''),
    name: (a, b) => a.c.name.localeCompare(b.c.name, langInfo().locale),
    high: (a, b) => Math.abs(b.bal) - Math.abs(a.bal),
    low: (a, b) => Math.abs(a.bal) - Math.abs(b.bal),
  };
  rows.sort(sorters[ui.sort] ?? sorters.recent);
  const kinds = { all: all.length, customers: all.filter((c) => c.contactType === 1).length, suppliers: all.filter((c) => c.contactType === 2).length };
  const list = rows.map(({ c, bal, last }) => `<li><a class="k-row-link" href="${link(`/khata/app/b/${bookId}/contact/${c.id}`)}">${avatar(c.name)}
      <span class="mid"><b>${esc(c.name)}</b><small><span class="k-badge">${ico(c.contactType === 1 ? 'store' : 'truck', 12)}${t(c.contactType === 1 ? 'khata.c.customer' : 'khata.c.supplier')}</span>${last ? t('khata.c.lastEntry', { date: formatDate(last) }) : t('khata.c.noEntries')}</small></span>
      <span class="end"><span class="amt k-num ${balTone(bal)}">${money(bal, cur)}</span>${statusBadge(bal, !!last)}</span>${ico('chev', 18)}</a></li>`).join('');
  const f = ui.form ?? {};
  const errs = ui.errors;
  const addForm = ui.adding ? `<form class="k-card k-form k-addform" data-submit="kContactCreate" data-book="${bookId}" novalidate aria-labelledby="add-h">
      <div class="k-card-h"><div><h2 id="add-h">${t('khata.c.addTitle')}</h2><p>${t('khata.c.addLead')}</p></div></div>
      <div class="k-two"><label class="k-field ico"><span class="lbl">${t('khata.c.name')}</span>${ico('user', 18)}<input id="k-cname" name="name" type="text" maxlength="100" required autocomplete="off" value="${esc(f.name ?? '')}" aria-invalid="${!!errs.name}" /></label>
        <label class="k-field ico"><span class="lbl">${t('khata.c.mobile')}</span>${ico('phone', 18)}<input name="mobile" type="tel" inputmode="tel" autocomplete="off" value="${esc(f.mobile ?? '')}" aria-invalid="${!!errs.mobile}" /></label>
        <label class="k-field ico"><span class="lbl">${t('khata.c.email')}</span>${ico('mail', 18)}<input name="email" type="email" autocomplete="off" value="${esc(f.email ?? '')}" aria-invalid="${!!errs.email}" /></label>
        <label class="k-field"><span class="lbl">${t('khata.c.type')}</span><select name="type"><option value="1"${f.type !== '2' ? ' selected' : ''}>${t('khata.c.customer')}</option><option value="2"${f.type === '2' ? ' selected' : ''}>${t('khata.c.supplier')}</option></select></label></div>
      ${errBox(ui.error)}
      <div class="k-actions"><button type="button" class="k-btn" data-act="kAddContact">${t('khata.cancel')}</button><button type="submit" class="k-btn pri">${ico('check', 18)}${t('khata.c.save')}</button></div></form>` : '';
  const html = `<div class="k-page k-stagger">
    <div class="k-head"><div><h1 id="parties-h1">${t('khata.nav.parties')}</h1><p>${t('khata.c.lead', { n: all.length })}</p></div><button type="button" class="k-btn pri" aria-expanded="${ui.adding}" data-act="kAddContact">${ico(ui.adding ? 'x' : 'plus', 18)}${t(ui.adding ? 'khata.cancel' : 'khata.c.add')}</button></div>
    ${addForm}
    <div class="k-sumbar"><div><small>${t('khata.c.willGet')}</small><b class="k-num k-get">${money(sums.get, cur)}</b></div><div><small>${t('khata.c.willGive')}</small><b class="k-num k-give">${money(sums.give, cur)}</b></div><div><small>${t('khata.d.partiesT')}</small><b class="k-num">${all.length}</b></div></div>
    <div class="k-card k-toolbar" style="padding:14px">
      <div class="line"><label class="k-search">${ico('search', 18)}<span class="sr-only">${t('khata.c.search')}</span><input id="k-search" type="search" placeholder="${t('khata.c.search')}" value="${esc(ui.query)}" data-input="kSearch" /></label>
        <label class="k-sort">${ico('sort', 18)}<span class="sr-only">${t('khata.sort.label')}</span><select data-change="kSort">${['recent', 'name', 'high', 'low'].map((s) => `<option value="${s}"${ui.sort === s ? ' selected' : ''}>${t('khata.sort.' + s)}</option>`).join('')}</select></label></div>
      <div class="k-seg" role="group" aria-label="${t('khata.c.type')}" style="justify-self:start">${['all', 'customers', 'suppliers'].map((k) => `<button type="button" data-act="kFilter" data-f="kind" data-v="${k}" aria-pressed="${ui.kind === k}">${t('khata.f.' + k)} <span class="k-faint">${kinds[k]}</span></button>`).join('')}</div>
      <div class="k-chips" role="group" aria-label="${t('khata.f.status')}">${chip('status', 'all', t('khata.f.all'))}${chip('status', 'collect', t('khata.s.toCollect'))}${chip('status', 'pay', t('khata.s.toPay'))}${chip('status', 'settled', t('khata.s.paid'))}</div></div>
    ${list ? `<ul class="k-list" aria-label="${t('khata.nav.parties')}">${list}</ul>` : `<div class="k-card k-empty">${emptyArt(q || ui.kind !== 'all' || ui.status !== 'all' ? 'search' : 'users')}<h2>${t(all.length ? 'khata.c.noMatch' : 'khata.c.none')}</h2>${all.length ? `<button type="button" class="k-btn" data-act="kClearFilters">${t('khata.f.clear')}</button>` : `<button type="button" class="k-btn pri" data-act="kAddContact">${ico('plus', 18)}${t('khata.c.add')}</button>`}</div>`}
  </div>`;
  return { title: traw('khata.nav.parties'), html };
}

INPUT.kSearch = (el) => {
  K.ui.query = el.value;
  render();
};
CHANGE.kSort = (el) => {
  K.ui.sort = el.value;
  render();
};
ACT.kFilter = (el) => {
  K.ui[el.dataset.f] = el.dataset.v;
  render();
};
ACT.kClearFilters = () => {
  Object.assign(K.ui, { query: '', kind: 'all', status: 'all', from: '', to: '' });
  render();
};
ACT.kAddContact = () => {
  K.ui.adding = !K.ui.adding;
  K.ui.error = '';
  K.ui.errors = {};
  K.ui.form = null;
  render();
  document.getElementById('k-cname')?.focus();
};

/** Checks the contact form field by field, so the wrong field can be marked. */
function contactFields(data) {
  const name = String(data.get('name') ?? '').trim();
  const mobile = String(data.get('mobile') ?? '').trim();
  const email = String(data.get('email') ?? '').trim();
  const errors = {};
  if (!name || name.length > 100)
    errors.name = true;
  if (mobile && !/^\+?[\d\s-]{7,16}$/.test(mobile))
    errors.mobile = true;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = true;
  return { fields: { name, mobile, email, contactType: +data.get('type') }, errors, ok: !Object.keys(errors).length };
}

SUBMIT.kContactCreate = (form, data) => {
  const { fields, errors, ok } = contactFields(data);
  K.ui.error = '';
  K.ui.errors = errors;
  K.ui.form = { name: fields.name, mobile: fields.mobile, email: fields.email, type: String(fields.contactType) };
  if (!ok) {
    K.ui.error = msg('KHATA_CONTACT_INVALID');
    render();
    form.ownerDocument.querySelector('.k-addform [aria-invalid=true]')?.focus();
    return;
  }
  K.contacts.push({ id: kid(), bookId: +form.dataset.book, address: '', note: '', allowContactEntries: false, ...fields });
  K.ui.adding = false;
  K.ui.form = null;
  kToast(traw('khata.c.added', { name: fields.name }));
  render();
};

// #endregion

