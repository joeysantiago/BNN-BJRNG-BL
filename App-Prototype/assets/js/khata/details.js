/* SnapKhata: Transaction details. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Transaction details

function entryPage(bookId, entryId) {
  const book = K.books.find((b) => b.id === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  const e = findEntry(entryId);
  const contact = e ? K.contacts.find((c) => c.id === e.contactId && c.bookId === bookId) : null;
  if (!e || !contact)
    return notFound('KHATA_ENTRY_NOT_FOUND');
  const cur = curOf(book);
  const gave = e.entryType === GAVE;
  const running = runningBalances(contactEntries(contact.id));
  const versions = [...e.history, { version: e.version, changeType: e.isDeleted ? 3 : e.version > 1 ? 2 : 1, changedOn: e.history.length ? todayIso() : e.entryDate, snapshot: e, current: true }].reverse();
  const photos = e.photos.map((p, i) => `<li class="k-thumb"><button type="button" class="open" data-act="kEntryView" data-i="${i}" aria-label="${t('khata.ph.alt', { n: i + 1 })}"><img data-photo="${esc(p.id)}" alt="" /></button><span class="size">${fileSize(p.size)}</span></li>`).join('');
  const html = `<div class="k-page k-stagger" style="width:min(820px,100%);margin-inline:auto">
    <a class="k-back" href="${link(`/khata/app/b/${bookId}/contact/${contact.id}`)}">${ico('back', 18)}${esc(contact.name)}</a>
    ${e.isDeleted ? `<p class="k-err" role="note">${ico('trash', 18)}<span>${t('khata.td.deletedNote')}</span></p>` : ''}
    <section class="k-card k-detail-amt" aria-labelledby="td-h1"><span class="k-tx-ico ${gave ? 'give' : 'get'}" style="width:56px;height:56px;border-radius:18px">${ico(gave ? 'gave' : 'got', 26, 2.4)}</span>
      <h1 id="td-h1" class="sr-only">${t('khata.td.title')}</h1>${typeBadge(e.entryType)}
      <b class="big k-num ${gave ? 'k-give' : 'k-get'}"${e.isDeleted ? ' style="text-decoration:line-through"' : ''}>${money(e.amountMinor, cur)}</b>
      <span class="k-muted">${t(gave ? 'khata.td.gaveTo' : 'khata.td.gotFrom', { name: contact.name })} · ${formatDate(e.entryDate)}</span>
      ${e.addedByMe && !e.isDeleted ? `<div class="k-actions" style="justify-content:center;margin-top:8px"><a class="k-btn" href="${link(`/khata/app/b/${bookId}/e/${e.id}/edit`)}">${ico('edit', 18)}${t('khata.e.edit')}</a><button type="button" class="k-btn danger" data-act="kDelete" data-id="${e.id}">${ico('trash', 18)}${t('khata.e.delete')}</button></div>` : ''}</section>
    <div class="k-grid2">
      <section class="k-card" aria-labelledby="td-info"><div class="k-card-h"><h2 id="td-info">${t('khata.td.info')}</h2></div><dl class="k-dl">
        <div><dt>${ico('user', 16)}${t('khata.ef.party')}</dt><dd><a href="${link(`/khata/app/b/${bookId}/contact/${contact.id}`)}">${esc(contact.name)}</a></dd></div>
        <div><dt>${ico('swap', 16)}${t('khata.e.type')}</dt><dd>${t(gave ? 'khata.td.debit' : 'khata.td.credit')}</dd></div>
        <div><dt>${ico('calendar', 16)}${t('khata.e.date')}</dt><dd>${formatDate(e.entryDate)}</dd></div>
        <div><dt>${ico('note', 16)}${t('khata.td.note')}</dt><dd>${e.note ? esc(e.note) : `<span class="k-faint">${t('khata.td.noNote')}</span>`}</dd></div>
        ${running.has(e.id) ? `<div><dt>${ico('wallet', 16)}${t('khata.td.balAfter')}</dt><dd class="k-num ${balTone(running.get(e.id))}">${money(running.get(e.id), cur)}</dd></div>` : ''}
        <div><dt>${ico('users', 16)}${t('khata.td.addedBy')}</dt><dd>${t(e.addedByMe ? 'khata.td.you' : 'khata.e.byContact')}</dd></div>
        <div><dt>${ico('hash', 16)}${t('khata.td.status')}</dt><dd>${e.isDeleted ? `<span class="k-badge give">${t('khata.e.deleted')}</span>` : e.version > 1 ? `<span class="k-badge warn">${t('khata.e.version', { n: e.version })} · ${t('khata.e.edited')}</span>` : `<span class="k-badge get">${ico('check', 12, 3)}${t('khata.td.active')}</span>`}</dd></div></dl></section>
      <section class="k-card" aria-labelledby="td-ph"><div class="k-card-h"><div><h2 id="td-ph">${t('khata.ph.title')}</h2><p>${t('khata.td.photosLead')}</p></div><span class="k-badge">${ico('clip', 12)}${e.photos.length}</span></div>
        ${e.photos.length ? `<ul class="k-thumbs">${photos}</ul>` : `<div class="k-empty" style="padding:16px">${emptyArt('image')}<p>${t('khata.td.noPhotos')}</p>${e.addedByMe && !e.isDeleted ? `<a class="k-btn sm" href="${link(`/khata/app/b/${bookId}/e/${e.id}/edit`)}">${ico('camera', 16)}${t('khata.td.addPhoto')}</a>` : ''}</div>`}</section>
    </div>
    <section class="k-card" aria-labelledby="td-hist"><div class="k-card-h"><div><h2 id="td-hist">${t('khata.e.historyTitle')}</h2><p>${t('khata.td.histLead')}</p></div><span class="k-badge">${ico('history', 12)}${versions.length}</span></div>
      <ol class="k-timeline">${versions.map((v) => `<li class="${v.changeType === 3 ? 'del' : ''}"><b>${t('khata.e.version', { n: v.version })}${v.current ? ` · ${t('khata.td.current')}` : ''}</b>
        <small>${t(v.changeType === 3 ? 'khata.e.deleted' : v.changeType === 2 ? 'khata.td.changed' : 'khata.td.created')} · ${t(v.snapshot.entryType === GAVE ? 'khata.e.gave' : 'khata.e.got')} <b class="k-num" style="display:inline">${money(v.snapshot.amountMinor, cur)}</b> · ${formatDate(v.snapshot.entryDate)}${v.snapshot.note ? ' · ' + esc(v.snapshot.note) : ''}${(v.snapshot.photos ?? []).length ? ` · ${t('khata.td.nPhotos', { n: v.snapshot.photos.length })}` : ''}</small></li>`).join('')}</ol></section>
  </div>`;
  return { title: traw('khata.td.title'), html };
}

ACT.kEntryView = (el) => {
  const e = findEntry(S.route.parts[5]);
  openViewer(e.photos.map((p) => ({ id: p.id, url: PHOTO_DB.urls.get(p.id) ?? null, name: p.name })), +el.dataset.i);
};
ACT.kDelete = (el) => {
  const e = findEntry(el.dataset.id);
  const cur = curOf(K.books.find((b) => b.id === K.bookId));
  askPin(traw('khata.e.deleteTitle', { amount: money(e.amountMinor, cur) }), () => {
    e.history.push({ version: e.version, changeType: e.version === 1 ? 1 : 2, changedOn: todayIso(), snapshot: { entryType: e.entryType, amountMinor: e.amountMinor, entryDate: e.entryDate, note: e.note, photos: e.photos } });
    e.isDeleted = true;
    e.version++;
    kToast(traw('khata.td.deleted'));
  });
};

// #endregion

