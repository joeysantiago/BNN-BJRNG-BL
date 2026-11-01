/* SnapKhata: All entries of a book. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region All entries of a book

function entriesPage(bookId) {
  const book = K.books.find((b) => b.id === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  if (K.ui.loading)
    return { title: traw('khata.nav.entries'), html: skeleton('list') };
  if (K.ui.sort === 'recent')
    K.ui.sort = 'newest';
  const cur = curOf(book);
  const ui = K.ui;
  const all = bookEntries(bookId);
  const shown = filterEntries(all, ui, true);
  const liveShown = shown.filter(live);
  const gaveT = liveShown.filter((e) => e.entryType === GAVE).reduce((s, e) => s + e.amountMinor, 0);
  const gotT = liveShown.filter((e) => e.entryType === GOT).reduce((s, e) => s + e.amountMinor, 0);
  const grouped = ui.sort === 'newest' || ui.sort === 'oldest';
  const row = (e) => txRow(e, cur, bookId, { party: true });
  const html = `<div class="k-page k-stagger">
    <div class="k-head"><div><h1 id="entries-h1">${t('khata.nav.entries')}</h1><p>${t('khata.en.lead', { book: book.name })}</p></div><a class="k-btn pri" href="${link(`/khata/app/b/${bookId}/new`)}">${ico('plus', 18)}${t('khata.nav.newEntry')}</a></div>
    <div class="k-sumbar"><div><small>${t('khata.e.gave')}</small><b class="k-num k-give">${money(gaveT, cur)}</b></div><div><small>${t('khata.e.got')}</small><b class="k-num k-get">${money(gotT, cur)}</b></div><div><small>${t('khata.en.shown')}</small><b class="k-num">${shown.length}</b></div></div>
    ${entryToolbar(ui, true)}
    ${shown.length ? `<ul class="k-list">${grouped ? byMonth(shown, row) : shown.map(row).join('')}</ul>` : `<div class="k-card k-empty">${emptyArt(all.length ? 'search' : 'list')}<h2>${t(all.length ? 'khata.f.noMatch' : 'khata.e.noneTitle')}</h2><p>${t(all.length ? 'khata.f.noMatchLead' : 'khata.en.none')}</p>${all.length ? `<button type="button" class="k-btn" data-act="kClearFilters">${t('khata.f.clear')}</button>` : ''}</div>`}
  </div>`;
  return { title: traw('khata.nav.entries'), html };
}

// #endregion

