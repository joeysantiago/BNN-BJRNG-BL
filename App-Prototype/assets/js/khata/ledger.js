/* SnapKhata: Ledger. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Ledger (one party's entries)

/** Balance after each live entry, oldest first, for the "balance" line under each amount. */
function runningBalances(list) {
  const out = new Map();
  let bal = 0;
  [...list].filter(live).sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id).forEach((e) => {
    bal += e.entryType === GAVE ? e.amountMinor : -e.amountMinor;
    out.set(e.id, bal);
  });
  return out;
}

function filterEntries(list, ui, withParty) {
  const q = ui.query.trim().toLowerCase();
  const out = list
    .filter((e) => ui.kind === 'all' || (ui.kind === 'gave' ? e.entryType === GAVE && live(e) : ui.kind === 'got' ? e.entryType === GOT && live(e) : ui.kind === 'photos' ? e.photos.length > 0 : e.isDeleted))
    .filter((e) => ui.kind === 'deleted' || ui.kind === 'all' || live(e))
    .filter((e) => !ui.from || e.entryDate >= ui.from)
    .filter((e) => !ui.to || e.entryDate <= ui.to)
    .filter((e) => !q || (e.note ?? '').toLowerCase().includes(q) || (withParty && (K.contacts.find((c) => c.id === e.contactId)?.name ?? '').toLowerCase().includes(q)));
  const sorters = { newest: byNewest, oldest: (a, b) => -byNewest(a, b), high: (a, b) => b.amountMinor - a.amountMinor, low: (a, b) => a.amountMinor - b.amountMinor };
  return out.sort(sorters[ui.sort] ?? byNewest);
}

function entryToolbar(ui, withParty) {
  const sort = ui.sort === 'recent' ? 'newest' : ui.sort;
  return `<div class="k-card k-toolbar" style="padding:14px">
      <div class="line"><label class="k-search">${ico('search', 18)}<span class="sr-only">${t(withParty ? 'khata.f.searchAll' : 'khata.f.searchNote')}</span><input id="k-search" type="search" placeholder="${t(withParty ? 'khata.f.searchAll' : 'khata.f.searchNote')}" value="${esc(ui.query)}" data-input="kSearch" /></label>
        <label class="k-sort">${ico('sort', 18)}<span class="sr-only">${t('khata.sort.label')}</span><select data-change="kSort">${['newest', 'oldest', 'high', 'low'].map((s) => `<option value="${s}"${sort === s ? ' selected' : ''}>${t('khata.sort.' + s)}</option>`).join('')}</select></label></div>
      <div class="k-chips" role="group" aria-label="${t('khata.e.type')}">${chip('kind', 'all', t('khata.f.all'))}${chip('kind', 'gave', t('khata.e.gave'))}${chip('kind', 'got', t('khata.e.got'))}${chip('kind', 'photos', `${ico('clip', 14)}${t('khata.f.photos')}`)}${chip('kind', 'deleted', t('khata.e.deleted'))}</div>
      ${withParty ? `<div class="k-dates"><label>${t('khata.f.from')}<input id="k-from" type="date" value="${esc(ui.from)}" max="${todayIso()}" data-change="kDate" data-f="from" /></label><label>${t('khata.f.to')}<input id="k-to" type="date" value="${esc(ui.to)}" max="${todayIso()}" data-change="kDate" data-f="to" /></label>${ui.from || ui.to ? `<button type="button" class="k-btn ghost sm" data-act="kClearFilters">${t('khata.f.clear')}</button>` : ''}</div>` : ''}</div>`;
}

CHANGE.kDate = (el) => {
  K.ui[el.dataset.f] = el.value;
  render();
};

function ledgerPage(bookId, contactId) {
  const book = K.books.find((b) => b.id === bookId);
  const contact = K.contacts.find((c) => c.id === contactId && c.bookId === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  if (!contact)
    return notFound('KHATA_CONTACT_NOT_FOUND');
  if (K.ui.loading)
    return { title: contact.name, html: skeleton('list') };
  if (K.ui.sort === 'recent')
    K.ui.sort = 'newest';
  const cur = curOf(book);
  const ui = K.ui;
  const all = contactEntries(contactId);
  const bal = contactBalance(contactId);
  const running = runningBalances(all);
  const shown = filterEntries(all, ui, false);
  const gaveT = all.filter((e) => live(e) && e.entryType === GAVE).reduce((s, e) => s + e.amountMinor, 0);
  const gotT = all.filter((e) => live(e) && e.entryType === GOT).reduce((s, e) => s + e.amountMinor, 0);
  const grouped = ui.sort === 'newest' || ui.sort === 'oldest';
  const row = (e) => txRow(e, cur, bookId, { running: running.has(e.id) ? running.get(e.id) : undefined });
  const listHtml = shown.length ? `<ul class="k-list">${grouped ? byMonth(shown, row) : shown.map(row).join('')}</ul>` : `<div class="k-card k-empty">${emptyArt(all.length ? 'search' : 'list')}<h2>${t(all.length ? 'khata.f.noMatch' : 'khata.e.noneTitle')}</h2><p>${t(all.length ? 'khata.f.noMatchLead' : 'khata.e.none')}</p></div>`;
  const html = `<div class="k-page k-stagger">
    <a class="k-back" href="${link(`/khata/app/b/${bookId}/parties`)}">${ico('back', 18)}${t('khata.nav.parties')}</a>
    <section class="k-card k-party" aria-labelledby="ledger-h1">
      <div class="who">${avatar(contact.name, 'lg')}<div style="min-width:0;flex:1"><h1 id="ledger-h1">${esc(contact.name)}</h1><div class="meta"><span class="k-badge">${ico(contact.contactType === 1 ? 'store' : 'truck', 12)}${t(contact.contactType === 1 ? 'khata.c.customer' : 'khata.c.supplier')}</span>${contact.mobile ? `<span class="k-badge">${ico('phone', 12)}${esc(contact.mobile)}</span>` : ''}${contact.email ? `<span class="k-badge">${ico('mail', 12)}${esc(contact.email)}</span>` : ''}</div></div></div>
      <div class="bal"><div><span class="k-muted">${t(bal > 0 ? 'khata.e.balanceGet' : bal < 0 ? 'khata.e.balanceGive' : 'khata.e.balanceSettled')}</span><b class="k-num ${balTone(bal)}" data-count="${Math.abs(bal)}" data-cur="${cur.id}">${money(bal, cur)}</b></div>${statusBadge(bal, all.some(live))}</div>
      <div class="tools">${contact.mobile ? `<a class="k-btn sm" href="tel:${esc(contact.mobile.replace(/[\s-]/g, ''))}">${ico('phone', 16)}${t('khata.e.call')}</a>` : ''}${contact.email ? `<a class="k-btn sm" href="mailto:${esc(contact.email)}">${ico('mail', 16)}${t('khata.e.email')}</a>` : ''}<a class="k-btn sm" href="${link(`/khata/app/b/${bookId}/contact/${contactId}/settings`)}">${ico('settings', 16)}${t('khata.e.settings')}</a></div>
    </section>
    <div class="k-sumbar"><div><small>${t('khata.d.totalGave')}</small><b class="k-num k-give">${money(gaveT, cur)}</b></div><div><small>${t('khata.d.totalGot')}</small><b class="k-num k-get">${money(gotT, cur)}</b></div><div><small>${t('khata.nav.entries')}</small><b class="k-num">${all.filter(live).length}</b></div></div>
    <h2 class="k-group" style="margin-top:4px">${t('khata.e.historyAll')}</h2>
    ${all.length ? entryToolbar(ui, false) : ''}
    ${listHtml}
    <div class="k-sticky"><a class="k-btn gave lg" href="${link(`/khata/app/b/${bookId}/new?contact=${contactId}&type=${GAVE}`)}">${ico('gave', 20, 2.4)}${t('khata.e.gave')}</a><a class="k-btn got lg" href="${link(`/khata/app/b/${bookId}/new?contact=${contactId}&type=${GOT}`)}">${ico('got', 20, 2.4)}${t('khata.e.got')}</a></div>
  </div>`;
  return { title: contact.name, html };
}

// #endregion

