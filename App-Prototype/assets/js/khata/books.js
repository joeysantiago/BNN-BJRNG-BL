/* SnapKhata: Books. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Books

function currencyOptions(selected) {
  return K.currencies.map((c) => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${esc(c.symbol)} · ${esc(c.code)} · ${esc(c.name)}</option>`).join('');
}

function homePage() {
  const html = `<div class="k-page k-stagger" style="width:min(560px,100%);margin-inline:auto"><form class="k-card k-form" data-submit="kFirstBook" novalidate>
      <div class="k-empty" style="padding:6px 0 0">${emptyArt('book')}<h1 style="font-size:22px">${t('khata.book.firstTitle')}</h1><p>${t('khata.book.firstLead')}</p></div>
      <label class="k-field"><span class="lbl">${t('khata.book.name')}</span><input id="k-bookname" name="name" type="text" maxlength="100" required value="${t('khata.book.defaultName')}" /></label>
      <label class="k-field"><span class="lbl">${t('khata.book.currency')}</span><select name="currency">${currencyOptions(1)}</select></label>
      <p class="k-hint">${t('khata.book.lockedHint')}</p>${errBox(K.ui.error)}<button type="submit" class="k-btn pri lg">${ico('plus', 18)}${t('khata.book.create')}</button></form></div>`;
  return { title: traw('khata.book.firstTitle'), html };
}

function createBook(name, currencyId) {
  name = name.trim();
  if (!name || name.length > 100) {
    K.ui.error = msg('KHATA_BOOK_NAME_INVALID', 100);
    return null;
  }
  if (K.books.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
    K.ui.error = msg('KHATA_BOOK_NAME_TAKEN');
    return null;
  }
  if (K.books.length >= 20) {
    K.ui.error = msg('KHATA_BOOK_LIMIT', 20);
    return null;
  }
  const book = { id: kid(), name, currencyId: +currencyId };
  K.books.push(book);
  return book;
}

SUBMIT.kFirstBook = (form, data) => {
  const book = createBook(String(data.get('name')), data.get('currency'));
  if (book)
    go(`/khata/app/b/${book.id}`);
  else
    render();
};

function booksPage() {
  const ui = K.ui;
  const custom = K.currencies.filter((c) => c.custom);
  const list = K.books.map((b) => {
    const cur = curOf(b);
    const sums = bookSums(b);
    if (ui.editing === b.id) {
      return `<li class="k-card k-book"><form class="k-form" data-submit="kBookSave" data-id="${b.id}" novalidate>
          <label class="k-field"><span class="lbl">${t('khata.book.name')}</span><input id="k-bookedit" name="name" type="text" maxlength="100" required value="${esc(b.name)}" /></label>
          <label class="k-field"><span class="lbl">${t('khata.book.currency')}</span><select name="currency"${sums.hasEntries ? ' disabled' : ''}>${currencyOptions(b.currencyId)}</select></label>
          ${sums.hasEntries ? `<p class="k-hint">${t('khata.book.lockedNow')}</p>` : ''}
          <div class="k-actions"><button type="button" class="k-btn" data-act="kBookEdit" data-id="">${t('khata.cancel')}</button><button type="submit" class="k-btn pri">${t('khata.save')}</button></div></form></li>`;
    }
    return `<li class="k-card k-book lift"><div class="top"><span class="k-ib brand">${ico('book')}</span><a href="${link('/khata/app/b/' + b.id)}"><b>${esc(b.name)}</b><small class="k-muted">${esc(cur.symbol)} ${esc(cur.code)} · ${t('khata.books.contacts', { n: sums.count })}</small></a>${b.id === K.bookId ? `<span class="k-badge brand">${t('khata.books.current')}</span>` : ''}</div>
        <div class="nums"><div><small>${t('khata.c.willGet')}</small><b class="k-num k-get">${money(sums.get, cur)}</b></div><div><small>${t('khata.c.willGive')}</small><b class="k-num k-give">${money(sums.give, cur)}</b></div></div>
        <div class="k-actions" style="justify-content:flex-start"><a class="k-btn sm" href="${link('/khata/app/b/' + b.id)}">${t('khata.books.open')}</a><button type="button" class="k-btn sm" data-act="kBookEdit" data-id="${b.id}">${ico('edit', 16)}${t('khata.books.rename')}</button><button type="button" class="k-btn sm danger" data-act="kBookDelete" data-id="${b.id}">${ico('trash', 16)}${t('khata.books.delete')}</button></div></li>`;
  });
  const html = `<div class="k-page k-stagger">
    <div class="k-head"><div><h1 id="books-h1">${t('khata.books.title')}</h1><p>${t('khata.books.lead')}</p></div><button type="button" class="k-btn pri" aria-expanded="${ui.creating}" data-act="kBookNew">${ico(ui.creating ? 'x' : 'plus', 18)}${t(ui.creating ? 'khata.cancel' : 'khata.books.new')}</button></div>
    ${ui.creating ? `<form class="k-card k-form k-addform" data-submit="kBookCreate" novalidate><div class="k-two"><label class="k-field"><span class="lbl">${t('khata.book.name')}</span><input id="k-newbook" name="name" type="text" maxlength="100" required /></label>
      <label class="k-field"><span class="lbl">${t('khata.book.currency')}</span><select name="currency">${currencyOptions(1)}</select></label></div><p class="k-hint">${t('khata.book.lockedHint')}</p>
      <div class="k-actions"><button type="submit" class="k-btn pri">${t('khata.book.create')}</button></div></form>` : ''}
    ${okBox(ui.info)}${errBox(ui.error)}
    ${list.length ? `<ul class="k-list k-bookcards">${list.join('')}</ul>` : `<div class="k-card k-empty">${emptyArt('book')}<h2>${t('khata.books.none')}</h2></div>`}
    <section class="k-card k-form" aria-labelledby="cur-h"><div class="k-card-h"><div><h2 id="cur-h">${t('khata.cur.title')}</h2><p>${t('khata.cur.lead')}</p></div></div>
      ${custom.length ? `<div class="k-curs">${custom.map((c) => `<div class="k-cur"><span><b>${esc(c.symbol)}</b> ${esc(c.code)} · ${esc(c.name)} · <span class="k-muted">${t('khata.cur.decimalsN', { n: c.decimals })}</span></span><button type="button" class="k-btn sm danger" data-act="kCurRemove" data-id="${c.id}">${t('khata.cur.remove')}</button></div>`).join('')}</div>` : ''}
      <form class="k-form" data-submit="kCurAdd" novalidate><div class="k-grid4">
        <label class="k-field"><span class="lbl">${t('khata.cur.code')}</span><input name="code" type="text" maxlength="10" required /></label><label class="k-field"><span class="lbl">${t('khata.cur.symbol')}</span><input name="symbol" type="text" maxlength="10" required /></label>
        <label class="k-field"><span class="lbl">${t('khata.cur.name')}</span><input name="name" type="text" maxlength="50" required /></label>
        <label class="k-field"><span class="lbl">${t('khata.cur.decimals')}</span><select name="decimals"><option value="0">0</option><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></label></div>
        <div class="k-actions"><button type="submit" class="k-btn">${ico('plus', 18)}${t('khata.cur.add')}</button></div></form></section>
  </div>`;
  return { title: traw('khata.books.title'), html };
}

ACT.kBookNew = () => {
  K.ui.creating = !K.ui.creating;
  render();
  document.getElementById('k-newbook')?.focus();
};
SUBMIT.kBookCreate = (form, data) => {
  K.ui.error = '';
  const book = createBook(String(data.get('name')), data.get('currency'));
  if (book) {
    K.ui.creating = false;
    kToast(traw('khata.books.created', { name: book.name }));
  }
  render();
};
ACT.kBookEdit = (el) => {
  K.ui.editing = el.dataset.id ? +el.dataset.id : null;
  render();
  document.getElementById('k-bookedit')?.focus();
};
SUBMIT.kBookSave = (form, data) => {
  const book = K.books.find((b) => b.id === +form.dataset.id);
  const name = String(data.get('name')).trim();
  K.ui.error = '';
  if (!name || name.length > 100) {
    K.ui.error = msg('KHATA_BOOK_NAME_INVALID', 100);
    return render();
  }
  if (K.books.some((b) => b !== book && b.name.toLowerCase() === name.toLowerCase())) {
    K.ui.error = msg('KHATA_BOOK_NAME_TAKEN');
    return render();
  }
  book.name = name;
  if (data.get('currency') && !bookSums(book).hasEntries)
    book.currencyId = +data.get('currency');
  K.ui.editing = null;
  kToast(traw('khata.cs.saved'));
  render();
};
ACT.kBookDelete = (el) => {
  const book = K.books.find((b) => b.id === +el.dataset.id);
  askPin(traw('khata.books.deleteTitle', { name: book.name }), () => {
    const ids = bookContacts(book.id).map((c) => c.id);
    K.entries = K.entries.filter((e) => !ids.includes(e.contactId));
    K.contacts = K.contacts.filter((c) => c.bookId !== book.id);
    K.books = K.books.filter((b) => b !== book);
    if (K.bookId === book.id)
      K.bookId = K.books.length ? K.books[0].id : 0;
    K.ui.info = msg('KHATA_BOOK_DELETED');
  });
};
SUBMIT.kCurAdd = (form, data) => {
  const code = String(data.get('code')).trim().toUpperCase();
  const symbol = String(data.get('symbol')).trim();
  const name = String(data.get('name')).trim();
  K.ui.error = '';
  K.ui.info = '';
  if (!code || !symbol || !name)
    K.ui.error = msg('KHATA_CURRENCY_INVALID');
  else if (K.currencies.some((c) => c.code === code))
    K.ui.error = msg('KHATA_CURRENCY_CODE_TAKEN');
  else
    K.currencies.push({ id: kid(), code, symbol, name, decimals: +data.get('decimals'), isIso: false, custom: true });
  render();
};
ACT.kCurRemove = (el) => {
  const id = +el.dataset.id;
  K.ui.error = '';
  if (K.books.some((b) => b.currencyId === id)) {
    K.ui.error = msg('KHATA_CURRENCY_IN_USE');
  } else {
    K.currencies = K.currencies.filter((c) => c.id !== id);
    K.ui.info = msg('KHATA_CURRENCY_DELETED');
  }
  render();
};

// #endregion

