/* SnapKhata: Add / edit entry with bill photos. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Add / edit entry with bill photos

const findEntry = (id) => K.entries.find((e) => e.id === +id);

/** Forgets an unsaved form and frees the previews of photos that were never saved. */
function dropDraft() {
  if (K.draft && !K.draft.saved)
    K.draft.photos.filter((p) => p.isNew).forEach((p) => URL.revokeObjectURL(p.url));
  K.draft = null;
}

function entryFormPage(bookId, entryId) {
  const book = K.books.find((b) => b.id === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  const cur = curOf(book);
  const contacts = bookContacts(bookId);
  const entry = entryId ? findEntry(entryId) : null;
  if (entryId && (!entry || !contacts.some((c) => c.id === entry.contactId)))
    return notFound('KHATA_ENTRY_NOT_FOUND');
  if (entry && (!entry.addedByMe || entry.isDeleted))
    return { title: traw('khata.e.editTitle'), html: `<div class="k-card k-empty">${emptyArt('note')}<h1 style="font-size:20px">${t('khata.e.cantEdit')}</h1><a class="k-btn" href="${link(`/khata/app/b/${bookId}/e/${entry.id}`)}">${t('khata.back')}</a></div>` };
  if (!contacts.length)
    return { title: traw('khata.nav.newEntry'), html: `<div class="k-card k-empty">${emptyArt('users')}<h1 style="font-size:20px">${t('khata.d.emptyTitle')}</h1><p>${t('khata.ef.needParty')}</p><a class="k-btn pri" href="${link(`/khata/app/b/${bookId}/parties?add=1`)}">${ico('plus', 18)}${t('khata.c.add')}</a></div>` };
  if (!K.draft) {
    const q = S.route.query;
    K.draft = entry
      ? { mode: 'edit', entryId: entry.id, contactId: entry.contactId, type: String(entry.entryType), amount: fromMinor(entry.amountMinor, cur.decimals), date: entry.entryDate, note: entry.note, photos: entry.photos.map((p) => ({ ...p, isNew: false })), errors: {}, error: '', busy: null }
      : { mode: 'add', contactId: contacts.some((c) => c.id === +q.contact) ? +q.contact : 0, type: q.type === String(GOT) ? String(GOT) : String(GAVE), amount: '', date: todayIso(), note: '', photos: [], errors: {}, error: '', busy: null };
  }
  const d = K.draft;
  const e = d.errors;
  const back = entry ? `/khata/app/b/${bookId}/e/${entry.id}` : d.contactId && S.route.query.contact ? `/khata/app/b/${bookId}/contact/${d.contactId}` : `/khata/app/b/${bookId}`;
  const opt = (c) => `<option value="${c.id}"${c.id === d.contactId ? ' selected' : ''}>${esc(c.name)}</option>`;
  const party = entry
    ? `<div class="k-field"><span class="lbl">${t('khata.ef.party')}</span><div class="k-row-link" style="min-height:56px;cursor:default">${avatar(K.contacts.find((c) => c.id === d.contactId).name)}<span class="mid"><b>${esc(K.contacts.find((c) => c.id === d.contactId).name)}</b></span></div></div>`
    : `<label class="k-field"><span class="lbl">${t('khata.ef.party')}</span><select id="k-party" name="contact" data-input="kDraft" aria-invalid="${!!e.contact}" required><option value="" disabled${d.contactId ? '' : ' selected'}>${t('khata.ef.choose')}</option>
        <optgroup label="${t('khata.f.customers')}">${contacts.filter((c) => c.contactType === 1).map(opt).join('')}</optgroup><optgroup label="${t('khata.f.suppliers')}">${contacts.filter((c) => c.contactType === 2).map(opt).join('')}</optgroup></select>${e.contact ? `<p class="k-hint k-give">${t('khata.ef.partyRequired')}</p>` : ''}</label>`;
  const thumbs = d.photos.map((p, i) => `<li class="k-thumb"><button type="button" class="open" data-act="kDraftView" data-i="${i}" aria-label="${t('khata.ph.alt', { n: i + 1 })}"><img ${p.isNew ? `src="${esc(p.url)}"` : `data-photo="${esc(p.id)}"`} alt="" /></button>
      ${p.isNew ? `<span class="new">${t('khata.ph.new')}</span>` : ''}<span class="size">${fileSize(p.size)}</span>
      <span class="tools"><button type="button" data-act="kPhotoReplace" data-i="${i}" aria-label="${t('khata.ph.replace', { n: i + 1 })}" title="${t('khata.ph.replaceShort')}">${ico('swap', 16)}</button><button type="button" data-act="kPhotoRemove" data-i="${i}" aria-label="${t('khata.ph.remove', { n: i + 1 })}" title="${t('khata.ph.removeShort')}">${ico('x', 16)}</button></span></li>`).join('');
  const busyPhotos = d.busy === 'photos';
  const html = `<div class="k-page k-stagger" style="width:min(760px,100%);margin-inline:auto">
    <a class="k-back" href="${link(back)}">${ico('back', 18)}${t('khata.back')}</a>
    <div class="k-head"><div><h1 id="ef-h1">${t(entry ? 'khata.e.editTitle' : 'khata.ef.title')}</h1><p>${t(entry ? 'khata.ef.editLead' : 'khata.ef.lead', { book: book.name })}</p></div></div>
    <form class="k-card k-entry" data-submit="kEntrySave" novalidate aria-labelledby="ef-h1">
      <fieldset class="k-typeseg" style="border:0;margin:0"><legend class="sr-only">${t('khata.e.type')}</legend>
        <label class="gave"><input type="radio" name="type" value="${GAVE}" data-input="kDraft"${d.type === String(GAVE) ? ' checked' : ''} />${ico('gave', 18, 2.4)}${t('khata.e.gave')}</label>
        <label class="got"><input type="radio" name="type" value="${GOT}" data-input="kDraft"${d.type === String(GOT) ? ' checked' : ''} />${ico('got', 18, 2.4)}${t('khata.e.got')}</label></fieldset>
      ${party}
      <div class="k-amountbox"><label class="lbl" for="k-amount">${t('khata.ef.amount')}</label><div class="in"><span class="sym" aria-hidden="true">${esc(cur.symbol)}</span><input id="k-amount" name="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0${cur.decimals ? '.' + '0'.repeat(cur.decimals) : ''}" value="${esc(d.amount)}" data-input="kDraft" aria-invalid="${!!e.amount}" aria-describedby="k-amount-hint" /></div>
        <p id="k-amount-hint" class="k-hint${e.amount ? ' k-give' : ''}" style="margin:0">${t(e.amount ? 'khata.e.amountInvalid' : 'khata.ef.amountHint', { code: cur.code, n: cur.decimals })}</p></div>
      <div class="k-two"><label class="k-field ico"><span class="lbl">${t('khata.e.date')}</span>${ico('calendar', 18)}<input id="k-date" name="date" type="date" required max="${todayIso()}" value="${esc(d.date)}" data-input="kDraft" aria-invalid="${!!e.date}" />${e.date ? `<p class="k-hint k-give">${t('khata.ef.dateRule')}</p>` : ''}</label>
        <div class="k-field"><span class="lbl">${t('khata.ef.status')}</span><div style="min-height:48px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${entry ? `<span class="k-badge warn">${t('khata.e.version', { n: entry.version })}</span>` : `<span class="k-badge brand">${t('khata.ef.newEntry')}</span>`}<span class="k-hint" style="margin:0">${t(entry ? 'khata.ef.pinNote' : 'khata.ef.noPin')}</span></div></div></div>
      <label class="k-field"><span class="lbl">${t('khata.e.note')}</span><textarea id="k-note" name="note" maxlength="500" placeholder="${t('khata.ef.notePh')}" data-input="kDraft" aria-invalid="${!!e.note}">${esc(d.note)}</textarea></label>
      <section aria-labelledby="ph-h" style="display:grid;gap:12px"><div class="k-card-h" style="margin:0"><div><h2 id="ph-h">${ico('camera', 18)} ${t('khata.ph.title')}</h2><p>${t('khata.ph.lead', { max: MAX_PHOTOS })}</p></div><span class="k-badge${d.photos.length >= MAX_PHOTOS ? ' warn' : ''}">${d.photos.length}/${MAX_PHOTOS}</span></div>
        ${d.photos.length ? `<ul class="k-thumbs">${thumbs}</ul>` : ''}
        ${d.photos.length < MAX_PHOTOS ? `<div class="k-drop">${busyPhotos ? `<span class="k-spin" style="color:var(--k-brand)" aria-hidden="true"></span><p role="status">${t('khata.ph.working')}</p>` : `<span class="k-ib brand">${ico('image', 20)}</span><p>${t('khata.ph.drop')}</p>
          <div class="btns"><button type="button" class="k-btn sm" data-act="kPick" data-target="k-pick">${ico('image', 16)}${t('khata.ph.choose')}</button><button type="button" class="k-btn sm" data-act="kPick" data-target="k-cam">${ico('camera', 16)}${t('khata.ph.camera')}</button></div>
          <p>${t('khata.ph.rules', { mb: 10 })}</p>`}</div>` : `<p class="k-hint">${t('khata.ph.full', { max: MAX_PHOTOS })}</p>`}
        <input class="k-file" type="file" id="k-pick" accept="${PHOTO_TYPES.join(',')}" multiple data-change="kPhotos" tabindex="-1" aria-hidden="true" />
        <input class="k-file" type="file" id="k-cam" accept="image/*" capture="environment" data-change="kPhotos" tabindex="-1" aria-hidden="true" />
        <input class="k-file" type="file" id="k-rep" accept="${PHOTO_TYPES.join(',')}" data-change="kPhotoReplaced" tabindex="-1" aria-hidden="true" /></section>
      ${errBox(d.error)}
      <div class="k-actions"><a class="k-btn lg" href="${link(back)}">${t('khata.cancel')}</a><button type="submit" class="k-btn pri lg${d.busy === 'save' ? ' is-busy' : ''}"${busyPhotos ? ' disabled' : ''}>${d.busy === 'save' ? `<span class="k-spin" aria-hidden="true"></span>${t('khata.ef.saving')}` : `${ico('check', 18)}${t(entry ? 'khata.ef.saveEdit' : 'khata.ef.save')}`}</button></div>
    </form>
  </div>`;
  return { title: traw(entry ? 'khata.e.editTitle' : 'khata.ef.title'), html };
}

INPUT.kDraft = (el) => {
  if (!K.draft)
    return;
  K.draft[el.name === 'contact' ? 'contactId' : el.name] = el.name === 'contact' ? +el.value : el.value;
  if (K.draft.errors[el.name]) {
    K.draft.errors[el.name] = false;
    el.setAttribute('aria-invalid', 'false');
  }
};
ACT.kPick = (el) => document.getElementById(el.dataset.target)?.click();
CHANGE.kPhotos = (el) => {
  const files = [...el.files];
  el.value = '';
  addPhotos(files);
};
ACT.kPhotoReplace = (el) => {
  K.draft.replace = +el.dataset.i;
  document.getElementById('k-rep').click();
};
CHANGE.kPhotoReplaced = (el) => {
  const files = [...el.files];
  el.value = '';
  if (files.length)
    addPhotos(files.slice(0, 1), K.draft.replace);
};
ACT.kPhotoRemove = (el) => {
  const d = K.draft;
  const [gone] = d.photos.splice(+el.dataset.i, 1);
  if (gone.isNew)
    URL.revokeObjectURL(gone.url);
  d.error = '';
  render();
};
ACT.kDraftView = (el) => openViewer(K.draft.photos.map((p) => ({ id: p.isNew ? null : p.id, url: p.isNew ? p.url : PHOTO_DB.urls.get(p.id) ?? null, name: p.name })), +el.dataset.i);

/** Checks, compresses and adds picked photos to the open form (or replaces one of them). */
async function addPhotos(files, replaceAt) {
  const d = K.draft;
  if (!d || d.busy)
    return;
  d.error = '';
  let list = files;
  if (replaceAt === undefined && d.photos.length + list.length > MAX_PHOTOS) {
    d.error = traw('khata.ph.tooMany', { max: MAX_PHOTOS });
    list = list.slice(0, MAX_PHOTOS - d.photos.length);
  }
  if (!list.length)
    return render();
  d.busy = 'photos';
  render();
  for (const f of list) {
    if (!PHOTO_TYPES.includes(f.type)) {
      d.error = traw('khata.ph.badType', { name: f.name });
      continue;
    }
    if (f.size > MAX_PHOTO_INPUT) {
      d.error = traw('khata.ph.tooBig', { name: f.name, mb: 10 });
      continue;
    }
    try {
      const blob = await compressPhoto(f);
      if (!blob || blob.size > MAX_PHOTO_BYTES) {
        d.error = traw('khata.ph.tooBig', { name: f.name, mb: 2 });
        continue;
      }
      const item = { id: newPhotoId(), isNew: true, blob, url: URL.createObjectURL(blob), name: f.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg'), size: blob.size, type: blob.type };
      if (replaceAt !== undefined && d.photos[replaceAt]) {
        if (d.photos[replaceAt].isNew)
          URL.revokeObjectURL(d.photos[replaceAt].url);
        d.photos[replaceAt] = item;
      } else {
        d.photos.push(item);
      }
    } catch {
      d.error = traw('khata.ph.unreadable', { name: f.name });
    }
  }
  d.busy = null;
  if (K.draft === d)
    render();
}

SUBMIT.kEntrySave = (form, data) => {
  const d = K.draft;
  if (!d || d.busy)
    return;
  const bookId = K.bookId;
  const cur = curOf(K.books.find((b) => b.id === bookId));
  const contactId = d.mode === 'edit' ? d.contactId : +(data.get('contact') ?? 0);
  const amount = toMinor(String(data.get('amount') ?? ''), cur.decimals);
  const date = String(data.get('date') ?? '');
  const note = String(data.get('note') ?? '').trim();
  const type = +data.get('type');
  Object.assign(d, { contactId, amount: String(data.get('amount') ?? ''), date, note: String(data.get('note') ?? ''), type: String(type) });
  d.errors = { contact: !bookContacts(bookId).some((c) => c.id === contactId), amount: !amount, date: !date || date > todayIso(), note: note.length > 500 };
  d.error = '';
  if (Object.values(d.errors).some(Boolean)) {
    d.error = d.errors.amount ? traw('khata.e.amountInvalid') : msg('KHATA_ENTRY_INVALID');
    render();
    document.querySelector('.k-entry [aria-invalid=true]')?.focus();
    return;
  }
  const values = { contactId, entryType: type, amountMinor: amount, entryDate: date, note };
  if (d.mode === 'add')
    commitEntry(d, values, bookId);
  else
    askPin(traw('khata.e.editTitle'), () => commitEntry(d, values, bookId));
};

/** Saves the photo files first, then the entry that points at them; nothing is half-saved if a photo can't be stored. */
async function commitEntry(d, values, bookId) {
  d.busy = 'save';
  render();
  try {
    for (const p of d.photos.filter((x) => x.isNew))
      await photoPut(p.id, p.blob);
  } catch {
    d.busy = null;
    d.error = traw('khata.ph.saveFailed');
    return render();
  }
  await new Promise((r) => setTimeout(r, 350));
  const photos = d.photos.map((p) => ({ id: p.id, name: p.name, size: p.size, type: p.type }));
  d.photos.filter((p) => p.isNew).forEach((p) => PHOTO_DB.urls.set(p.id, p.url));
  d.saved = true;
  let target;
  if (d.mode === 'add') {
    target = { id: kid(), ...values, version: 1, isDeleted: false, addedByMe: true, history: [], photos };
    K.entries.push(target);
    kToast(traw('khata.ef.saved'));
  } else {
    target = findEntry(d.entryId);
    target.history.push({ version: target.version, changeType: target.version === 1 ? 1 : 2, changedOn: todayIso(), snapshot: { entryType: target.entryType, amountMinor: target.amountMinor, entryDate: target.entryDate, note: target.note, photos: target.photos } });
    Object.assign(target, { entryType: values.entryType, amountMinor: values.amountMinor, entryDate: values.entryDate, note: values.note, photos, version: target.version + 1 });
    kToast(traw('khata.ef.updated'));
  }
  kSave();
  go(d.mode === 'add' ? `/khata/app/b/${bookId}/contact/${values.contactId}` : `/khata/app/b/${bookId}/e/${target.id}`, true);
}

// #endregion

