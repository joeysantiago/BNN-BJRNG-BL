/* SnapKhata: SnapKhata state. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region SnapKhata state (the session is in memory, so a reload logs out like the real app; the ledger and its photos stay in this browser)

const GAVE = 1;
const GOT = 2;
const MIN_PIN = 4;
const MAX_PHOTOS = 3;
const PHOTO_EDGE = 1600;
const MAX_PHOTO_INPUT = 10 * 1024 * 1024;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const KDATA = 'khata-data';
const KTHEME = 'mode'; // dashboard: the shared light / dark / system preference (thakurg-proto-mode)
const THEMES = ['light', 'dark', 'system'];
const freshUi = () => ({ creating: false, editing: null, adding: false, query: '', kind: 'all', status: 'all', sort: 'recent', from: '', to: '', loading: false, info: '', error: '', errors: {} });
const K = {
  loggedIn: false, unlocked: false, hasPin: false, pin: '', identifier: '', codeSent: false, devCode: null, wait: 0, waitTimer: null, info: '', error: '',
  entry: '', first: null, pinTries: 5, sheet: null, sheetPin: '', sheetError: '', seeded: false, nextId: 100, otp: '', busy: false, verified: false, idBad: false, otpBad: false, pinBad: false,
  currencies: CURRENCIES.map((c, i) => ({ id: i + 1, ...c, isIso: true, custom: false })),
  books: [], contacts: [], entries: [], bookId: 0, anim: true, toast: null, viewer: null, draft: null,
  theme: THEMES.includes(store.get(KTHEME)) ? store.get(KTHEME) : 'system',
  ui: freshUi(),
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
const kid = () => ++K.nextId;
const curOf = (book) => K.currencies.find((c) => c.id === book.currencyId);

/** Amount for display in the reader's language: real currency codes use Intl, custom money types put their symbol in front. */
function money(minor, cur) {
  const value = Math.abs(minor) / 10 ** cur.decimals;
  const options = { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals };
  if (cur.isIso)
    try {
      return new Intl.NumberFormat(langInfo().locale, { ...options, style: 'currency', currency: cur.code }).format(value);
    } catch {
      /* unknown code: fall through to the symbol */
    }
  return `${cur.symbol} ${new Intl.NumberFormat(langInfo().locale, options).format(value)}`;
}

/** Short axis amount such as 12K or 1.2L-style compact numbers, in the reader's language. */
const compact = (minor, cur) => new Intl.NumberFormat(langInfo().locale, { notation: 'compact', maximumFractionDigits: 1 }).format(minor / 10 ** cur.decimals);

/** Typed text to whole smallest units, digit by digit (never through floating point). */
function toMinor(text, decimals) {
  const clean = text.trim().replace(/[,\s]/g, '');
  const m = /^(\d{1,15})(?:\.(\d*))?$/.exec(clean);
  if (!m || (m[2] ?? '').length > decimals)
    return null;
  const minor = Number(m[1] + (m[2] ?? '').padEnd(decimals, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function fromMinor(minor, decimals) {
  const digits = String(Math.abs(minor)).padStart(decimals + 1, '0');
  return decimals ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}` : digits;
}

const live = (e) => !e.isDeleted;
const contactEntries = (cid) => K.entries.filter((e) => e.contactId === cid);
const contactBalance = (cid) => contactEntries(cid).filter(live).reduce((s, e) => s + (e.entryType === GAVE ? e.amountMinor : -e.amountMinor), 0);
const bookContacts = (bid) => K.contacts.filter((c) => c.bookId === bid);
const bookEntries = (bid) => {
  const ids = new Set(bookContacts(bid).map((c) => c.id));
  return K.entries.filter((e) => ids.has(e.contactId));
};
const byNewest = (a, b) => b.entryDate.localeCompare(a.entryDate) || b.id - a.id;

function bookSums(book) {
  let get = 0;
  let give = 0;
  let toGet = 0;
  let toGive = 0;
  bookContacts(book.id).forEach((c) => {
    const b = contactBalance(c.id);
    if (b > 0) {
      get += b;
      toGet++;
    } else if (b < 0) {
      give -= b;
      toGive++;
    }
  });
  return { get, give, toGet, toGive, count: bookContacts(book.id).length, hasEntries: bookEntries(book.id).length > 0 };
}

function lastEntryOn(cid) {
  const list = contactEntries(cid).filter(live).map((e) => e.entryDate).sort();
  return list.length ? list[list.length - 1] : null;
}

/** Saves the ledger (not the session or the PIN) so a reload and a new login find the same books. */
function kSave() {
  if (K.seeded)
    store.set(KDATA, JSON.stringify({ nextId: K.nextId, currencies: K.currencies, books: K.books, contacts: K.contacts, entries: K.entries }));
}

function kLoad() {
  try {
    const d = JSON.parse(store.get(KDATA) || 'null');
    if (!d || !Array.isArray(d.books))
      return;
    Object.assign(K, { nextId: d.nextId, currencies: d.currencies, books: d.books, contacts: d.contacts, entries: d.entries, seeded: true });
    K.entries.forEach((e) => (e.photos = e.photos ?? []));
  } catch {
    /* damaged data: start again with the demo ledger */
  }
}

/** Demo ledger created at first login, so every screen has something to show. */
function seed() {
  if (K.seeded)
    return;
  K.seeded = true;
  const inr = K.currencies.find((c) => c.code === 'INR').id;
  const aed = K.currencies.find((c) => c.code === 'AED').id;
  const shop = { id: kid(), name: 'Sharma Kirana Store', currencyId: inr };
  const office = { id: kid(), name: 'Dubai Office', currencyId: aed };
  K.books.push(shop, office);
  K.bookId = shop.id;
  const people = [
    [shop, 'Ramesh Kumar', '9876543210', '', 1, true],
    [shop, 'Suresh Traders', '9812345678', 'suresh.traders@example.com', 2, false],
    [shop, 'Priya Sharma', '', 'priya@example.com', 1, false],
    [shop, 'Anil Verma', '9988776655', '', 1, false],
    [shop, 'Fatima Khan', '', '', 1, false],
    [office, 'Ahmed Al Mansoori', '+971501234567', '', 1, false],
    [shop, 'Gupta Dairy', '9811122233', '', 2, false],
  ];
  const ids = people.map(([book, name, mobile, email, type, allow]) => {
    const c = { id: kid(), bookId: book.id, name, mobile, email, address: '', note: '', contactType: type, allowContactEntries: allow };
    K.contacts.push(c);
    return c.id;
  });
  const add = (ci, type, amount, ago, note, extra = {}) => K.entries.push({ id: kid(), contactId: ids[ci], entryType: type, amountMinor: amount, entryDate: daysAgo(ago), note, version: 1, isDeleted: false, addedByMe: true, history: [], photos: [], ...extra });
  add(0, GAVE, 180000, 160, 'Festival stock');
  add(0, GOT, 180000, 140, 'Cash');
  add(3, GAVE, 120000, 128, 'Wheat 50 kg');
  add(1, GOT, 900000, 110, 'Stock: rice and pulses');
  add(1, GAVE, 900000, 96, 'Bank transfer');
  add(3, GOT, 60000, 88, 'UPI');
  add(6, GOT, 240000, 72, 'Milk, March');
  add(6, GAVE, 240000, 64, 'UPI');
  add(4, GAVE, 56000, 52, 'Sweets');
  add(3, GOT, 60000, 44, 'Cash');
  add(4, GOT, 30000, 38, 'Cash');
  add(0, GAVE, 250000, 20, 'Rice 25 kg, dal 5 kg');
  add(0, GOT, 100000, 12, 'UPI');
  add(0, GAVE, 48000, 3, 'Cooking oil');
  add(0, GOT, 20000, 1, 'Cash', { addedByMe: false });
  add(1, GOT, 1200000, 15, 'Stock: biscuits and soap');
  add(1, GAVE, 500000, 6, 'Bank transfer');
  add(2, GAVE, 32050, 9, 'Milk and bread (month)');
  add(3, GAVE, 75000, 18, 'Sugar 10 kg');
  add(3, GOT, 75000, 4, 'Paid in full');
  add(6, GOT, 260000, 10, 'Milk, this month');
  add(5, GAVE, 150000, 7, 'Advance');
  // One entry that was edited and one that was deleted, so History has versions to show.
  const edited = K.entries.find((e) => e.note === 'Cooking oil');
  edited.history = [{ version: 1, changeType: 1, changedOn: daysAgo(3), snapshot: { entryType: GAVE, amountMinor: 45000, entryDate: daysAgo(3), note: 'Cooking oil', photos: [] } }];
  edited.version = 2;
  add(2, GAVE, 9900, 2, 'Eggs', { isDeleted: true, version: 2, history: [{ version: 1, changeType: 1, changedOn: daysAgo(2), snapshot: { entryType: GAVE, amountMinor: 9900, entryDate: daysAgo(2), note: 'Eggs', photos: [] } }] });
  seedPhotos();
}

/** A drawn bill photo on one demo entry, so the attachment screens have a real stored image to show. */
async function seedPhotos() {
  const target = K.entries.find((e) => e.note === 'Rice 25 kg, dal 5 kg');
  if (!target || target.photos.length)
    return;
  try {
    const blob = await receiptBlob();
    const id = newPhotoId();
    await photoPut(id, blob);
    target.photos = [{ id, name: 'bill-rice-dal.webp', size: blob.size, type: blob.type }];
    kSave();
    if (S.route.path.startsWith('/khata/app'))
      render();
  } catch {
    /* no canvas or storage: the demo simply has no photo */
  }
}

function receiptBlob() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 860;
  const g = c.getContext('2d');
  g.fillStyle = '#d9d2c3';
  g.fillRect(0, 0, 640, 860);
  g.shadowColor = 'rgba(0,0,0,0.25)';
  g.shadowBlur = 30;
  g.fillStyle = '#fffdf7';
  g.fillRect(70, 40, 500, 780);
  g.shadowBlur = 0;
  g.fillStyle = '#1f2328';
  g.textAlign = 'center';
  g.font = 'bold 30px monospace';
  g.fillText('SHARMA KIRANA STORE', 320, 112);
  g.font = '20px monospace';
  g.fillText('Main Bazaar, Jaipur', 320, 146);
  g.fillText(`Bill No. 1042   ${formatDate(daysAgo(20))}`, 320, 178);
  g.strokeStyle = '#9aa0a6';
  g.setLineDash([8, 6]);
  g.beginPath();
  g.moveTo(100, 206);
  g.lineTo(540, 206);
  g.stroke();
  g.textAlign = 'left';
  g.font = '23px monospace';
  [['Rice (Basmati) 25kg', '1,750.00'], ['Toor dal 5kg', '650.00'], ['Packing', '100.00']].forEach(([item, amt], i) => {
    g.fillText(item, 104, 256 + i * 46);
    g.textAlign = 'right';
    g.fillText(amt, 536, 256 + i * 46);
    g.textAlign = 'left';
  });
  g.beginPath();
  g.moveTo(100, 410);
  g.lineTo(540, 410);
  g.stroke();
  g.font = 'bold 28px monospace';
  g.fillText('TOTAL', 104, 460);
  g.textAlign = 'right';
  g.fillText('Rs 2,500.00', 536, 460);
  g.textAlign = 'center';
  g.font = '21px monospace';
  g.fillText('Udhaar: Ramesh Kumar', 320, 540);
  g.fillText('Thank you! Visit again', 320, 760);
  g.save();
  g.translate(430, 640);
  g.rotate(-0.25);
  g.strokeStyle = '#c4302b';
  g.setLineDash([]);
  g.lineWidth = 4;
  g.strokeRect(-90, -34, 180, 68);
  g.fillStyle = '#c4302b';
  g.font = 'bold 30px monospace';
  g.fillText('CREDIT', 0, 11);
  g.restore();
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/webp', 0.8));
}

// #endregion

