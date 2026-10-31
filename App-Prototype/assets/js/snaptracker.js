/* SnapTracker prototype. One file, no server: the "server" parts (OTP check, parsing, duplicate check) run in this page so the flow can be clicked through.
   Data lives in this browser's localStorage under "snaptracker:". The Android device panel stands in for the companion app's SMS receiver. */
'use strict';

// #region Basics

const DAY = 864e5, MIN = 6e4, HOUR = 36e5;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (ms) => { const d = new Date(ms); return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; };
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDT = (ms) => `${fmtDate(ms)}, ${fmtTime(ms)}`;
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfMonth = (ms) => { const d = new Date(ms); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const moneyShort = (n) => n >= 1e5 ? '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L' : n >= 1e3 ? '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : '₹' + Math.round(n);
const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\s+/g, ' ').trim();
function relDay(ms) {
  const d = startOfDay(ms), t = startOfDay(Date.now());
  if (d === t) return 'Today';
  if (d === t - DAY) return 'Yesterday';
  return fmtDate(ms);
}
function ago(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return fmtDate(ms);
}
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };

const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem('snaptracker:' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('snaptracker:' + k, JSON.stringify(v));
    } catch {
      /* private mode: the prototype still works, it just forgets */
    }
  },
  del(k) {
    try {
      localStorage.removeItem('snaptracker:' + k);
    } catch {
      /* ignore */
    }
  },
};

const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  finger: '<path d="M12 11v3a8 8 0 0 1-1.5 4.7M8 8.5A5 5 0 0 1 17 11v2a12 12 0 0 1-.6 3.8M5.5 13.5V11a6.5 6.5 0 0 1 1-3.5M12 3a8 8 0 0 1 8 8v1.5M4 7.5A9 9 0 0 1 7 4.5M8.5 15a10 10 0 0 1-1.6 4M15 17.5a14 14 0 0 1-1.3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  checkC: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  xC: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  sms: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  copy: '<path d="M9 9h10v10H9zM5 15V5h10"/>',
  alert: '<path d="M12 3l10 18H2zM12 10v4M12 17h.01"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM18 17H7a3 3 0 0 0-3 3"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 13.5h.01"/>',
  copies: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  filter: '<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

// #endregion

// #region Reference data

const CATS = {
  food: { name: 'Food & Dining', emoji: '🍜', color: '#f97316' },
  groceries: { name: 'Groceries', emoji: '🛒', color: '#84cc16' },
  shopping: { name: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  transport: { name: 'Transport', emoji: '🚕', color: '#eab308' },
  fuel: { name: 'Fuel', emoji: '⛽', color: '#b45309' },
  bills: { name: 'Bills & Utilities', emoji: '💡', color: '#06b6d4' },
  entertainment: { name: 'Entertainment', emoji: '🎬', color: '#8b5cf6' },
  health: { name: 'Health', emoji: '💊', color: '#ef4444' },
  travel: { name: 'Travel', emoji: '✈️', color: '#3b82f6' },
  rent: { name: 'Rent', emoji: '🏠', color: '#64748b' },
  cash: { name: 'Cash withdrawal', emoji: '🏧', color: '#94a3b8' },
  investment: { name: 'Investments', emoji: '📈', color: '#10b981' },
  salary: { name: 'Salary', emoji: '💼', color: '#22c55e' },
  transfer: { name: 'Transfers', emoji: '🔁', color: '#6366f1' },
  refund: { name: 'Refund', emoji: '↩️', color: '#14b8a6' },
  other: { name: 'Others', emoji: '🧾', color: '#9ca3af' },
};

/** Registered SMS headers (DLT) of banks and payment apps that SnapTracker listens to. Everything else is ignored on the phone. */
const BANKS = {
  HDFCBK: 'HDFC Bank', ICICIB: 'ICICI Bank', SBIINB: 'State Bank of India', SBIUPI: 'SBI UPI', CBSSBI: 'State Bank of India', ATMSBI: 'State Bank of India',
  AXISBK: 'Axis Bank', KOTAKB: 'Kotak Mahindra Bank', YESBNK: 'Yes Bank', IDFCFB: 'IDFC First Bank', INDUSB: 'IndusInd Bank', PNBSMS: 'Punjab National Bank',
  BOBTXN: 'Bank of Baroda', CANBNK: 'Canara Bank', UNIONB: 'Union Bank', PAYTMB: 'Paytm', PHONPE: 'PhonePe', GPAYIN: 'Google Pay', AMZPAY: 'Amazon Pay',
};
const SENDER_KIND = { T: 'Transactional', S: 'Service', P: 'Promotional', G: 'Government' };

/** Merchant dictionary: pattern, display name, category, sub-kind used for the description. */
const MERCHANTS = [
  [/zomato/i, 'Zomato', 'food'], [/swiggy/i, 'Swiggy', 'food'], [/domino/i, "Domino's", 'food'], [/starbucks/i, 'Starbucks', 'food'], [/mcdonald/i, "McDonald's", 'food'],
  [/blinkit/i, 'Blinkit', 'groceries'], [/zepto/i, 'Zepto', 'groceries'], [/bigbasket|bbnow/i, 'BigBasket', 'groceries'], [/dmart|avenue supermarts/i, 'DMart', 'groceries'],
  [/amazon|amzn/i, 'Amazon', 'shopping'], [/flipkart/i, 'Flipkart', 'shopping'], [/myntra/i, 'Myntra', 'shopping'], [/ajio/i, 'AJIO', 'shopping'],
  [/uber/i, 'Uber', 'transport'], [/\bola\b|olacabs/i, 'Ola', 'transport'], [/rapido/i, 'Rapido', 'transport'], [/metro rail|bmrcl|dmrc/i, 'Metro', 'transport'],
  [/irctc/i, 'IRCTC', 'travel'], [/makemytrip/i, 'MakeMyTrip', 'travel'], [/indigo/i, 'IndiGo', 'travel'],
  [/indian ?oil|iocl/i, 'Indian Oil', 'fuel'], [/hpcl|hindustan petroleum/i, 'HP Petrol', 'fuel'], [/bpcl|bharat petroleum/i, 'Bharat Petroleum', 'fuel'],
  [/bescom/i, 'BESCOM', 'bills', 'electricity'], [/tata ?power/i, 'Tata Power', 'bills', 'electricity'], [/adani ?electricity/i, 'Adani Electricity', 'bills', 'electricity'], [/msedcl|mahavitaran/i, 'MSEDCL', 'bills', 'electricity'],
  [/airtel/i, 'Airtel', 'bills', 'telecom'], [/\bjio\b/i, 'Jio', 'bills', 'telecom'], [/vodafone|\bvi\b/i, 'Vi', 'bills', 'telecom'], [/act ?fibernet/i, 'ACT Fibernet', 'bills', 'telecom'],
  [/netflix/i, 'Netflix', 'entertainment', 'subscription'], [/spotify/i, 'Spotify', 'entertainment', 'subscription'], [/hotstar/i, 'Disney+ Hotstar', 'entertainment', 'subscription'], [/bookmyshow/i, 'BookMyShow', 'entertainment'],
  [/apollo/i, 'Apollo Pharmacy', 'health'], [/pharmeasy/i, 'PharmEasy', 'health'], [/practo/i, 'Practo', 'health'],
  [/zerodha/i, 'Zerodha', 'investment'], [/groww/i, 'Groww', 'investment'], [/\blic\b/i, 'LIC', 'investment'],
];

const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India', len: 10, re: /^[6-9]\d{9}$/ },
  { code: '+971', flag: '🇦🇪', name: 'UAE', len: 9, re: /^5\d{8}$/ },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', len: 9, re: /^5\d{8}$/ },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada', len: 10, re: /^[2-9]\d{9}$/ },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', len: 10, re: /^7\d{9}$/ },
  { code: '+65', flag: '🇸🇬', name: 'Singapore', len: 8, re: /^[89]\d{7}$/ },
];
const BOOKS = ['Personal', 'Home', 'Business'];
const METHODS = ['UPI', 'Debit card', 'Credit card', 'Card', 'NEFT', 'IMPS', 'RTGS', 'Net banking', 'ATM', 'Bank account', 'Cash'];
const NOTE_TYPES = {
  newTx: { label: 'New transaction detected', help: 'Each time an SMS becomes a transaction.', icon: '⚡' },
  categorized: { label: 'Automatically categorised', help: 'When a transaction is auto-approved with a category.', icon: '🏷️' },
  verify: { label: 'Needs verification', help: 'When SnapTracker is not sure and wants you to check.', icon: '🔎' },
  duplicate: { label: 'Duplicate message detected', help: 'When the same payment arrives twice (bank + UPI app).', icon: '🧬' },
  revoked: { label: 'Tracking permission revoked', help: 'When SMS access is turned off on the phone.', icon: '⛔' },
  paused: { label: 'Tracking paused or resumed', help: 'When you pause or resume SMS tracking.', icon: '⏸️' },
  sync: { label: 'Synchronisation completed', help: 'After the phone uploads queued messages.', icon: '🔄' },
};

// #endregion

// #region Parser (server side in the real build; the phone only does the sender, OTP and promotion filters)

const OTP_WORD = /\b(otp|one[- ]time password|verification code|security code|auth(?:entication)? code)\b/i;
const DONE_RE = /\b(debited|credited|withdrawn|spent|deposited|has been (?:paid|sent|received))\b/i;
const PROMO_RE = /\b(offers?|cashback|discount|win|won|congratulations|pre-?approved|apply now|click|limited (?:period|time)|voucher|upto|sale|hurry|exclusive)\b/i;
const TXN_RE = /\b(debited|credited|spent|withdrawn|deposited|sent|paid|received|refund(?:ed)?)\b/i;
const FAILED_RE = /\b(failed|declined|unsuccessful|not successful|could not be (?:processed|completed))\b/i;
const SETTLED_REFUND_RE = /\b(?:has been|is|was|were)\s+(?:credited|refunded|reversed)\b|\breversed to\b/i;
const DEBIT_RE = /\b(debited|spent|sent|paid|withdrawn|deducted|purchase|payment of|transferred to)\b/i;
const CREDIT_RE = /\b(credited|received|deposited|refund(?:ed)?|reversed|added to)\b/i;
const AMT_ALT_RE = /\b(?:debited|credited)\s+(?:by|with|for)\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const ACC_RE = /(?:a\/c|acct|account|card)(?:\s*no\.?)?\s*(?:ending(?:\s*with)?\s*)?[x*]+\s?(\d{3,6})/i;
const REF_RES = [/UPI\/P2[MA]\/(\d{6,22})\//i, /\b(?:upi\s*)?ref(?:erence)?\.?\s*(?:no\.?|number|#|id)?\s*[:.#-]?\s*([A-Z0-9]{6,22})\b/i, /\b(?:txn|transaction)\s*(?:id|no\.?)\s*[:#-]?\s*([A-Z0-9]{6,22})\b/i, /\butr\s*(?:no\.?)?\s*[:#-]?\s*([A-Z0-9]{6,22})\b/i];
const DATE_RES = [
  /\b(\d{1,2})[-\/ ]?([A-Za-z]{3})[a-z]*[-\/ ,]?(\d{2,4})\b/,
  /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/,
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
];
const TIME_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i;
const STOP = String.raw`(?=\s+(?:on\b|via\b|using\b|ref|upi\b|is\b|has\b|from\b|with\b|avl|info\b|\()|\s*[.,(:;]|\s*$)`;
const mk = (w) => new RegExp(String.raw`\b(?:${w})\s+([A-Za-z0-9][A-Za-z0-9&'\-\/ ]{1,45}?)` + STOP, 'gi');
const M_AT = mk('at'), M_FOR = mk('for'), M_TO = mk('to|towards'), M_FROM = mk('from|by');
const VPA_RE = /(?:vpa|upi id|to|from|by)\s*[:\-]?\s*([a-z0-9][a-z0-9._-]{1,40}@[a-z][a-z0-9]{1,20})/i;
const P2M_RE = /UPI\/P2[MA]\/\d+\/([A-Za-z0-9 &.'-]{2,40}?)(?=\s*[.,\/]|\s+ref|\s*$)/i;
const BAD_M = /^(a\/c|ac\b|acct|account|your|you\b|the\b|card|upi\b|neft|imps|rtgs|xx|rs\b|rs\d|inr|date\b|txn|\d)/i;
const BAD_M2 = /\b(a\/c|acct|account|bank)\b/i;

function senderInfo(raw) {
  const m = /^[A-Z]{2}-([A-Z0-9]{6})(?:-([TSPG]))?$/i.exec(String(raw || '').trim());
  if (!m)
    return { known: false };
  const code = m[1].toUpperCase(), kind = (m[2] || 'T').toUpperCase();
  return { known: !!BANKS[code], code, kind, name: BANKS[code] || code, kindLabel: SENDER_KIND[kind] };
}

const isOtp = (b) => OTP_WORD.test(b) && /\b\d{4,8}\b/.test(b) && !DONE_RE.test(b);

function parseDate(b, receivedAt) {
  let d = null;
  let m = DATE_RES[0].exec(b);
  const mi = m ? MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) : -1;
  if (m && mi >= 0)
    d = new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), mi, +m[1]);
  else if ((m = DATE_RES[2].exec(b)))
    d = new Date(+m[1], +m[2] - 1, +m[3]);
  else if ((m = DATE_RES[1].exec(b)))
    d = new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1]);
  const r = new Date(receivedAt);
  if (!d || isNaN(d) || d.getTime() > receivedAt + DAY || d.getTime() < receivedAt - 60 * DAY)
    return { at: receivedAt, found: false };
  const t = TIME_RE.exec(b);
  if (t) {
    let h = +t[1];
    if (t[3] && /pm/i.test(t[3]) && h < 12)
      h += 12;
    if (t[3] && /am/i.test(t[3]) && h === 12)
      h = 0;
    d.setHours(h, +t[2], 0, 0);
  } else
    d.setHours(r.getHours(), r.getMinutes(), 0, 0);
  return { at: Math.min(d.getTime(), receivedAt), found: true, text: m[0] };
}

function firstGood(re, b) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(b))) {
    const c = m[1].trim();
    if (c.length > 1 && !BAD_M.test(c) && !BAD_M2.test(c))
      return c;
  }
  return null;
}

function lookupMerchant(text) {
  for (const [re, name, cat, kind] of MERCHANTS)
    if (re.test(text))
      return { name, cat, kind, known: true };
  return null;
}

function extractMerchant(b, type, method) {
  if (method === 'ATM')
    return { name: 'ATM', raw: null, cat: 'cash', known: true };
  let raw = null, vpa = null;
  const p2m = P2M_RE.exec(b);
  const v = VPA_RE.exec(b);
  if (p2m)
    raw = p2m[1].trim();
  else if (v) {
    raw = v[1];
    vpa = v[1];
  } else {
    const order = type === 'credit' ? [M_FROM, M_AT, M_FOR, M_TO] : [M_AT, M_TO, M_FOR];
    for (const re of order)
      if ((raw = firstGood(re, b)))
        break;
  }
  const dict = (raw && lookupMerchant(raw)) || lookupMerchant(b.replace(/\b[A-Z]{2}-[A-Z0-9]{6}\b/g, ''));
  if (dict)
    return { ...dict, raw };
  if (vpa) {
    const local = vpa.split('@')[0];
    const words = local.replace(/\d+/g, ' ').split(/[._\-\s]+/).filter((w) => w.length > 1);
    return words.length ? { name: titleCase(words.join(' ')), raw, cat: 'transfer', person: true } : { name: null, raw };
  }
  if (!raw)
    return { name: null, raw: null };
  const clean = raw.replace(/\s{2,}/g, ' ').trim();
  const business = /\b(pvt|ltd|llp|limited|store|stores|mart|general|services|enterprises|traders|shop|medical|bill|electricity|recharge|restaurant|cafe|hotel)\b/i.test(clean);
  const person = !business && (method === 'UPI' || /^NEFT|IMPS|RTGS|Bank/.test(method)) && /^[A-Za-z]+(?: [A-Za-z]+){1,2}$/.test(clean);
  return { name: titleCase(clean), raw, cat: person ? 'transfer' : null, person };
}

function parseSms(body, receivedAt) {
  const b = body;
  const am = AMT_ALT_RE.exec(b) || AMT_RE.exec(b);
  const amount = am ? Number(am[1].replace(/,/g, '')) : 0;
  const isRefund = /\b(refund(?:ed)?|reversed|reversal)\b/i.test(b);
  const di = b.search(DEBIT_RE), ci = b.search(CREDIT_RE);
  let type = null;
  if (isRefund && ci >= 0)
    type = 'credit';
  else if (di >= 0 && (ci < 0 || di < ci))
    type = 'debit';
  else if (ci >= 0)
    type = 'credit';
  let method = 'Bank account';
  if (/\batm\b/i.test(b) && /withdra/i.test(b))
    method = 'ATM';
  else if (/\b(upi|vpa)\b|@[a-z]{2,}/i.test(b))
    method = 'UPI';
  else if (/credit card/i.test(b))
    method = 'Credit card';
  else if (/debit card/i.test(b))
    method = 'Debit card';
  else if (/\bcard\b/i.test(b))
    method = 'Card';
  else if (/\b(neft|imps|rtgs)\b/i.test(b))
    method = /\bneft\b/i.test(b) ? 'NEFT' : /\bimps\b/i.test(b) ? 'IMPS' : 'RTGS';
  else if (/net ?banking/i.test(b))
    method = 'Net banking';
  const acc = ACC_RE.exec(b);
  let ref = null, refText = null;
  for (const re of REF_RES) {
    const r = re.exec(b);
    if (r && /\d/.test(r[1])) {
      ref = r[1].toUpperCase();
      refText = r[0];
      break;
    }
  }
  const date = parseDate(b, receivedAt);
  const merchant = type ? extractMerchant(b, type, method) : { name: null };
  return {
    amount: amount > 0 && isFinite(amount) ? amount : 0, amountText: am ? am[0] : null, type, ambiguous: di >= 0 && ci >= 0 && !isRefund, isRefund,
    method, account: acc ? 'XX' + acc[1].slice(-4) : null, accountText: acc ? acc[0] : null, ref, refText, at: date.at, dateFound: date.found, dateText: date.text,
    merchant: merchant.name, merchantRaw: merchant.raw, known: !!merchant.known, mCat: merchant.cat, mKind: merchant.kind, person: !!merchant.person,
  };
}

function categorize(p, body, rules) {
  if (p.merchant && rules[p.merchant.toLowerCase()])
    return rules[p.merchant.toLowerCase()];
  if (p.method === 'ATM')
    return 'cash';
  if (p.type === 'credit') {
    if (/\bsalary\b|\bsal\b|payroll/i.test(body))
      return 'salary';
    if (p.isRefund || (p.known && p.mCat !== 'transfer'))
      return 'refund';
    return p.person ? 'transfer' : 'other';
  }
  if (p.mCat)
    return p.mCat;
  if (/\brent\b/i.test(body))
    return 'rent';
  if (/electricity|recharge|broadband|\bdth\b|\bgas\b|\bbill\b/i.test(body))
    return 'bills';
  return 'other';
}

function confidence(p, cat) {
  let c = 30;
  if (p.amount)
    c += 25;
  if (p.type)
    c += 15;
  if (p.known)
    c += 15;
  else if (p.merchant)
    c += 7;
  if (p.account)
    c += 4;
  if (p.ref)
    c += 4;
  if (p.dateFound)
    c += 3;
  if (p.method !== 'Bank account')
    c += 3;
  if (cat === 'other')
    c -= 8;
  if (p.ambiguous)
    c -= 10;
  if (!p.type)
    c = Math.min(c, 40);
  return Math.max(5, Math.min(99, c));
}

/** Plain-language description. Never invents a merchant or purpose that the message does not show. */
function describe(t) {
  const a = money(t.amount), m = t.merchant, via = t.method && !['Bank account', 'ATM'].includes(t.method) ? ` via ${t.method}` : '';
  if (!t.type)
    return `${a} transaction detected. Please check whether money came in or went out.`;
  if (t.type === 'credit') {
    if (t.category === 'salary')
      return `Salary of ${a} credited${m ? ` from ${m}` : ''}.`;
    if (t.category === 'refund')
      return `Refund of ${a} received${m ? ` from ${m}` : ''}.`;
    if (t.method === 'UPI')
      return `${a} received through UPI${m ? ` from ${m}` : ''}.`;
    return `${a} credited to your account${t.account ? ` ending ${t.account.slice(-4)}` : ''}${m ? ` from ${m}` : ''}.`;
  }
  const kind = t.kind;
  if (t.category === 'cash')
    return `Cash withdrawal of ${a} at an ATM.`;
  if (m)
    switch (t.category) {
      case 'food': return `You spent ${a} on food at ${m}.`;
      case 'groceries': return `Grocery purchase of ${a} at ${m}.`;
      case 'shopping': return `Shopping payment of ${a} detected at ${m}.`;
      case 'transport': return `Ride payment of ${a} to ${m}.`;
      case 'fuel': return `Fuel purchase of ${a} at ${m}.`;
      case 'travel': return `Travel booking of ${a} with ${m}.`;
      case 'health': return `Health and pharmacy spend of ${a} at ${m}.`;
      case 'entertainment': return kind === 'subscription' ? `${m} subscription payment of ${a}.` : `Entertainment spend of ${a} at ${m}.`;
      case 'investment': return `Investment of ${a} with ${m}.`;
      case 'bills': return kind === 'electricity' ? `Electricity bill payment of ${a} detected (${m}).` : kind === 'telecom' ? `${m} recharge or bill payment of ${a}.` : `Bill payment of ${a} to ${m}.`;
      case 'transfer': return `You sent ${a} to ${m}${via}.`;
      case 'rent': return `Rent payment of ${a} to ${m}.`;
      default: return `Payment of ${a} to ${m}${via}.`;
    }
  if (t.category === 'bills')
    return `Bill payment of ${a} detected${via}.`;
  return `${a} debited from your account${t.account ? ` ending ${t.account.slice(-4)}` : ''}${via}.`;
}

function findDuplicate(t, D) {
  for (const x of D.txns) {
    if (x.id === t.id || x.status === 'duplicate')
      continue;
    if (t.sms && x.sms && x.sms.body === t.sms.body && Math.abs(x.sms.receivedAt - t.sms.receivedAt) < DAY)
      return { x, why: 'The same message arrived twice.' };
    if (t.ref && x.ref === t.ref && x.type === t.type)
      return { x, why: `Same reference number ${t.ref} as an earlier alert (bank and UPI app both sent one).` };
    if (x.amount === t.amount && x.type === t.type && Math.abs(x.at - t.at) <= 10 * MIN && (!t.merchant || !x.merchant || x.merchant === t.merchant) && (!t.account || !x.account || t.account === x.account))
      return { x, why: 'Same amount, direction and merchant within 10 minutes.' };
  }
  return null;
}

/** The full pipeline for one SMS. Returns what happened at each step, and adds the transaction when one is created. */
function processSms(D, sms, o = {}) {
  const steps = [];
  const st = (where, label, ok, detail) => steps.push({ where, label, ok, detail });
  const body = String(sms.body || '').replace(/\s+/g, ' ').trim();
  const skip = (counter, reason) => {
    if (counter)
      D.filtered[counter] = (D.filtered[counter] || 0) + 1;
    return { outcome: 'skipped', reason, steps };
  };
  const s = senderInfo(sms.sender);
  if (!body)
    return skip('other', 'Empty message.');
  if (!s.known) {
    st('phone', 'Sender allow-list', false, s.code ? `${s.code} is not a bank or payment app on the list.` : `"${sms.sender}" is a personal number or unknown sender.`);
    return skip('other', 'Not from a bank or payment app, so the phone ignored it. Nothing was read further or uploaded.');
  }
  st('phone', 'Sender allow-list', true, `${s.name} · ${s.kindLabel}`);
  if (isOtp(body)) {
    st('phone', 'OTP filter', false, 'Contains a one-time password.');
    return skip('otp', 'OTP message. Dropped on the phone without being stored or uploaded. SnapTracker never reads OTPs.');
  }
  st('phone', 'OTP filter', true, 'No one-time password.');
  if (s.kind === 'P' || (PROMO_RE.test(body) && !TXN_RE.test(body))) {
    st('phone', 'Promotion filter', false, s.kind === 'P' ? 'Header ends in -P (promotional).' : 'Advertising words and no transaction.');
    return skip('promo', 'Promotional message. Ignored on the phone.');
  }
  st('phone', 'Promotion filter', true, 'Looks like a transaction alert. Sent over HTTPS to the server.');
  if (FAILED_RE.test(body) && !SETTLED_REFUND_RE.test(body)) {
    st('server', 'Payment status', false, 'Failed or declined payment.');
    return skip('failed', 'Failed or declined payment. No money moved, so no transaction was created and the text was discarded.');
  }
  const p = parseSms(body, sms.receivedAt);
  if (!p.amount) {
    st('server', 'Extract amount', false, 'No amount in the message.');
    return skip('other', 'Unsupported format: no amount, so nothing was created and the text was discarded.');
  }
  st('server', 'Extract details', true, [money(p.amount), p.type || 'direction unclear', p.method, p.account, p.ref && 'Ref ' + p.ref].filter(Boolean).join(' · '));
  const category = categorize(p, body, D.rules);
  const t = {
    id: D.seq++, source: 'sms', type: p.type || 'debit', typeGuessed: !p.type, amount: p.amount, merchant: p.merchant, category, kind: p.mKind, method: p.method,
    account: p.account, ref: p.ref, at: p.at, confidence: 0, status: 'pending', description: '', note: '', edited: false, khata: null, dupOf: null, dupWhy: null,
    sms: { sender: String(sms.sender).toUpperCase(), senderName: s.name, body, receivedAt: sms.receivedAt, marks: [p.amountText, p.merchantRaw, p.accountText, p.refText].filter(Boolean) },
    createdAt: o.now || Date.now(),
  };
  t.confidence = confidence(p, category);
  t.description = describe({ ...t, type: p.type });
  st('server', 'Categorise', true, `${CATS[category].name} · ${p.known ? 'known merchant' : p.merchant ? 'merchant from text' : 'no merchant found'}`);
  st('server', 'Write description', true, t.description);
  const dup = findDuplicate(t, D);
  if (dup) {
    t.status = 'duplicate';
    t.dupOf = dup.x.id;
    t.dupWhy = dup.why;
    st('server', 'Duplicate check', false, dup.why);
  } else {
    st('server', 'Duplicate check', true, 'No match by reference, message or amount in the last 10 minutes.');
    const mode = D.settings.approval;
    const sure = p.type && t.confidence >= D.settings.threshold;
    t.status = mode === 'auto' ? (p.type ? 'auto' : 'pending') : mode === 'smart' && sure ? 'auto' : 'pending';
  }
  D.txns.push(t);
  if (t.status === 'auto' && D.settings.khata.autoPost)
    postKhata(D, t);
  st('server', 'Save', true, t.status === 'auto' ? `Saved and auto-approved (${t.confidence}% sure).` : t.status === 'pending' ? `Saved for your review (${t.confidence}% sure).` : 'Saved as a duplicate. Not counted in totals.');
  return { outcome: t.status === 'duplicate' ? 'duplicate' : 'created', txn: t, steps };
}

function postKhata(D, t) {
  if (t.khata || !['confirmed', 'auto'].includes(t.status))
    return;
  t.khata = { book: D.settings.khata.book, no: 'KE-' + D.khataSeq++, kind: t.type === 'debit' ? 'You paid (expense)' : 'You got (income)' };
}

// #endregion

// #region SMS templates (used by the sample history and the device panel)

const f2 = (n) => Number(n).toFixed(2);
const f2c = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`;
const dMon = (d) => `${pad(d.getDate())}${MON[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
const dMonY = (d) => `${pad(d.getDate())}-${MON[d.getMonth()].toUpperCase()}-${String(d.getFullYear()).slice(2)}`;
const TPL = {
  upiDebit: (amt, vpa, d, ref) => ['AD-HDFCBK-S', `Sent Rs.${f2(amt)} from HDFC Bank A/C *4821 to ${vpa} on ${dmy(d)}. Ref ${ref}. Not You? Call 18002586161/SMS BLOCK UPI to 7308080808`],
  phonepe: (amt, name, ref) => ['JM-PHONPE-S', `Paid Rs.${amt} to ${name} from HDFC Bank a/c XX4821 using PhonePe UPI. UPI Ref: ${ref}.`],
  card: (amt, m, d) => ['AX-ICICIB-S', `INR ${f2c(amt)} spent on ICICI Bank Credit Card XX9034 on ${dMonY(d)} at ${m}. Avl Lmt: INR 1,24,560.00. If not you, call 1800 2662/SMS BLOCK 9034 to 9215676766`],
  upiCredit: (amt, name, d, ref) => ['JD-SBIUPI-S', `Dear UPI user A/C X4821 credited by Rs${f2(amt)} on date ${dMon(d)} trf from ${name} Refno ${ref}. If not u? call 1800111109. -SBI`],
  bill: (amt, biller, d, ref) => ['JD-AXISBK-S', `Payment of INR ${f2c(amt)} for ${biller} from Axis Bank A/c XX7712 via UPI is successful on ${dmy(d)}. Ref no ${ref}.`],
  salary: (amt, d) => ['VK-HDFCBK-S', `INR ${f2c(amt)} credited to HDFC Bank A/c XX4821 on ${dmy(d)} by NEFT from ACME TECHNOLOGIES PVT LTD (Salary). Avl bal INR 1,02,340.55`],
  atm: (amt, d) => ['AD-SBIINB-S', `Rs.${amt} withdrawn at SBI ATM S1NW000123 from A/c X4821 on ${dmy(d)}. Avl Bal Rs.18,220.00`],
  refund: (amt, m, d, ref) => ['VM-HDFCBK-S', `Refund of Rs.${f2(amt)} from ${m} has been credited to your HDFC Bank A/c XX4821 on ${dmy(d)}. Ref ${ref}.`],
  p2m: (amt, shop, d, ref) => ['VM-AXISBK-S', `INR ${f2c(amt)} debited from A/c no. XX7712 on ${dmy(d)} for UPI/P2M/${ref}/${shop}. Not you? Call 18004195959`],
};

function sampleMessages(ref) {
  const d = new Date();
  const r2 = String(Number(ref) + 7311);
  return [
    { label: 'UPI payment to Zomato', tag: 'Debit', sms: TPL.upiDebit(450, 'zomato@hdfcbank', d, ref) },
    { label: 'Same payment, PhonePe alert', tag: 'Duplicate', sms: TPL.phonepe(450, 'Zomato', ref) },
    { label: 'Credit card at Amazon', tag: 'Debit', sms: TPL.card(2499, 'AMAZON', d) },
    { label: 'UPI from a friend', tag: 'Credit', sms: TPL.upiCredit(5000, 'RAHUL SHARMA', d, r2) },
    { label: 'Electricity bill', tag: 'Debit', sms: TPL.bill(1250, 'BESCOM Electricity bill', d, String(Number(ref) + 99)) },
    { label: 'Local shop (unknown)', tag: 'Review', sms: TPL.p2m(1140, 'GUPTA GENERAL', d, String(Number(ref) + 4321)) },
    { label: 'Refund from Amazon', tag: 'Credit', sms: TPL.refund(799, 'AMAZON', d, String(Number(ref) + 555)) },
    { label: 'ATM withdrawal', tag: 'Debit', sms: TPL.atm(2000, d) },
    { label: 'OTP message', tag: 'Ignored', sms: ['AX-ICICIB-S', '123456 is the OTP for your transaction of INR 3,200.00 at FLIPKART on ICICI Bank Card XX9034. Valid for 5 mins. Do not share it with anyone.'] },
    { label: 'Promotional offer', tag: 'Ignored', sms: ['VM-PAYTMB-P', 'Get flat 50% cashback upto Rs.500 on your next recharge! Limited period offer. Click https://p.paytm.me/xyz T&C'] },
    { label: 'Failed payment', tag: 'Ignored', sms: ['JM-PHONPE-S', 'Your payment of Rs.320 to Uber India failed. Any amount debited will be refunded within 3-5 working days.'] },
    { label: 'Malformed alert', tag: 'Ignored', sms: ['VM-KOTAKB-S', 'Txn alert: your a/c XX5521 was used. Details not available. Call 1860 266 2666 for info.'] },
    { label: 'Order update (not a bank)', tag: 'Ignored', sms: ['VM-SWIGGY-S', 'Your Swiggy order is on the way! Track it in the app.'] },
  ];
}

// #endregion

// #region State

function newData() {
  return {
    txns: [], seq: 1, khataSeq: 1041, notes: [], noteSeq: 1, rules: {}, filtered: { otp: 0, promo: 0, other: 0, failed: 0 },
    tracking: { state: 'permission', consent: false, since: null },
    settings: {
      approval: 'smart', threshold: 85, autoLock: 5, biometric: false, theme: 'system', push: true,
      khata: { autoPost: true, book: 'Personal' },
      notify: Object.fromEntries(Object.keys(NOTE_TYPES).map((k) => [k, true])),
    },
    lastSync: null,
    sampleLoaded: false,
  };
}

const S = {
  route: { path: '/', query: {} },
  user: null,
  data: null,
  locked: false,
  next: null,
  otp: null,
  resetOk: false,
  login: { mode: 'email', email: '', cc: '+91', phone: '', error: '', busy: false },
  ui: { filter: 'all', search: '', drawer: null, modal: null, notes: false, device: false, devResult: null, devNotes: [], syncing: false, ref: String(4300000000 + Math.floor(Math.random() * 99999999)) },
  lastActive: Date.now(),
  lockFails: 0,
};

const accounts = () => store.get('accounts', {});
const account = () => (S.user ? accounts()[S.user] || {} : {});
function saveAccount(patch) {
  const all = accounts();
  all[S.user] = { ...(all[S.user] || {}), ...patch };
  store.set('accounts', all);
}
const saveData = () => S.user && S.data && store.set('data:' + S.user, S.data);
function audit(user, event, detail = '') {
  if (!user)
    return;
  const list = store.get('audit:' + user, []);
  list.unshift({ at: Date.now(), event, detail });
  store.set('audit:' + user, list.slice(0, 60));
}
function loadUser(id) {
  S.user = id;
  S.data = store.get('data:' + id) || newData();
  // Prototype: an account without detected transactions gets the sample history once, so every screen can be seen filled in.
  if (!S.data.sampleLoaded && !S.data.txns.some((t) => t.source === 'sms')) {
    seedHistory();
    S.ui.filter = 'all';
  }
  saveData();
  applyTheme();
}

// #endregion

// #region Crypto (the real API uses Argon2id on the server; this page only demonstrates "never store the plain value")

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(s) {
  if (!globalThis.crypto?.subtle)
    return 'insecure-' + [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16);
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function pbkdf2(pw, salt) {
  if (!globalThis.crypto?.subtle)
    return sha256(salt + pw);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 }, key, 256));
}
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

// #endregion

// #region Router

function readRoute() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const [p, q = ''] = raw.split('?');
  return { path: p.replace(/\/+$/, '') || '/', query: Object.fromEntries(new URLSearchParams(q)) };
}
function go(path, replace) {
  if (replace)
    location.replace('#' + path);
  else
    location.hash = path;
}

function guard(p) {
  if (!S.user) {
    if (p === '/login')
      return null;
    if (p === '/otp' && S.otp && S.otp.purpose === 'login')
      return null;
    return '/login';
  }
  const acc = account();
  if (p === '/otp')
    return S.otp && S.otp.purpose === 'reset' ? null : '/app';
  if (p === '/password') {
    const mode = S.route.query.mode || 'setup';
    if (mode === 'reset')
      return S.resetOk ? null : acc.pw && S.locked ? '/lock' : '/app';
    if (acc.pw && S.locked)
      return '/lock';
    if (mode === 'setup' && acc.pw)
      return '/app';
    return null;
  }
  if (!acc.pw && !acc.skipped)
    return '/password';
  if (acc.pw && S.locked) {
    if (p !== '/lock' && p.startsWith('/app'))
      S.next = p;
    return p === '/lock' ? null : '/lock';
  }
  if (p === '/lock' || !p.startsWith('/app'))
    return '/app';
  return null;
}

function route() {
  S.route = readRoute();
  const g = guard(S.route.path);
  if (g && g !== S.route.path)
    return go(g, true);
  S.ui.notes = false;
  render(true);
  BRIDGE.report(location.hash.slice(1) || '/');
}

// #endregion

// #region Render core

const VIEWS = {
  '/login': loginView, '/otp': otpView, '/password': passwordView, '/lock': lockView,
  '/app': dashView, '/app/transactions': txnsView, '/app/privacy': privacyView, '/app/notifications': notifyView, '/app/settings': settingsView, '/app/how': howView,
};

function render(scrollTop) {
  const p = S.route.path;
  const v = (VIEWS[p] || dashView)();
  document.title = v.title + ' · SnapTracker';
  const inApp = p.startsWith('/app');
  const app = document.getElementById('app');
  const keep = document.activeElement && document.activeElement.id;
  app.innerHTML = inApp ? shellHtml(v) : v.html;
  if (keep && !scrollTop) {
    const el = document.getElementById(keep);
    if (el)
      el.focus({ preventScroll: true });
  }
  if (v.after)
    v.after();
  if (scrollTop)
    window.scrollTo(0, 0);
}

function shellHtml(v) {
  const p = S.route.path, D = S.data;
  const pending = D.txns.filter((t) => t.status === 'pending').length;
  const unread = D.notes.filter((n) => !n.read).length;
  const nav = [['/app', 'home', 'Dashboard'], ['/app/transactions', 'list', 'Transactions', pending], ['/app/privacy', 'shield', 'Privacy'], ['/app/notifications', 'bell', 'Alerts'], ['/app/settings', 'gear', 'Settings']];
  const cur = (path) => (p === path ? ' aria-current="page"' : '');
  return `<div class="shell">
  <aside class="side" aria-label="SnapTracker">
    ${logoHtml()}
    <nav class="nav" aria-label="Main">${nav.map(([path, icon, label, n]) => `<a href="#${path}"${cur(path)}>${ic(icon)}${label}${n ? `<span class="badge" aria-label="${n} pending">${n}</span>` : ''}</a>`).join('')}
      <a href="#/app/how"${cur('/app/how')}>${ic('layers')}How it works</a></nav>
    <div class="side-foot">
      <div class="side-card"><b>Linked to SnapKhata</b><br><span class="muted">Confirmed entries post to the <b>${esc(D.settings.khata.book)}</b> book.</span></div>
      <button class="btn ghost" data-act="lockNow" ${account().pw ? '' : 'disabled'}>${ic('lock')}Lock now</button>
    </div>
  </aside>
  <div class="main">
    <header class="top">
      ${logoHtml()}
      <div class="top-actions">
        ${statusPill()}
        <button class="btn ghost icon bell" data-act="toggleNotes" aria-label="Notifications${unread ? `, ${unread} unread` : ''}" aria-expanded="${S.ui.notes}">${ic('bell')}${unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
        <button class="btn ghost icon" data-act="theme" aria-label="Theme: ${D.settings.theme}">${ic(D.settings.theme === 'dark' ? 'moon' : D.settings.theme === 'light' ? 'sun' : 'auto')}</button>
        ${account().pw ? `<button class="btn ghost icon" data-act="lockNow" aria-label="Lock SnapTracker">${ic('lock')}</button>` : ''}
      </div>
    </header>
    <main id="main" tabindex="-1">${v.html}</main>
  </div>
  <nav class="bottom-nav" aria-label="Main">${nav.map(([path, icon, label, n]) => `<a href="#${path}"${cur(path)}>${ic(icon)}<span>${label === 'Transactions' ? 'Activity' : label}</span>${n ? `<span class="badge">${n}</span>` : ''}</a>`).join('')}</nav>
  <button class="fab" data-act="openDevice" aria-label="Open the simulated Android device">${ic('phone')}Device <small>PROTOTYPE</small></button>
  ${S.ui.notes ? notesPanel() : ''}
  ${S.ui.drawer != null ? drawerHtml() : ''}
  ${S.ui.device ? deviceHtml() : ''}
  ${S.ui.modal ? modalHtml() : ''}
</div>`;
}

const logoHtml = () => `<a class="logo" href="#/app"><span class="logo-mark">${ic('spark')}</span><span>SnapTracker<small>by SnapKhata</small></span></a>`;

function trackState() {
  if (S.ui.syncing)
    return { cls: 'sync', label: 'Syncing messages' };
  const st = S.data.tracking.state;
  return st === 'enabled' ? { cls: 'on', label: 'Tracking enabled' } : st === 'paused' ? { cls: 'paused', label: 'Tracking paused' } : { cls: 'perm', label: 'Permission required' };
}
function statusPill() {
  const s = trackState();
  return `<a class="status ${s.cls}" href="#/app/privacy" aria-label="${s.label}. Open privacy and permissions."><span class="dot"></span><span class="status-lbl">${s.label}</span></a>`;
}

// #endregion

// #region Auth views

function authFrame(inner) {
  return `<div class="auth">
  <section class="auth-art" aria-hidden="true">
    <div style="position:relative;z-index:1">
      <span class="logo" style="color:#fff"><span class="logo-mark" style="background:rgba(255,255,255,.2)">${ic('spark')}</span>SnapTracker</span>
      <h2 style="margin-top:40px">Every bank SMS becomes a tidy transaction. Automatically.</h2>
      <p>SnapTracker reads only bank and UPI alerts on your Android phone, works out what you paid for, and files it in your Khata.</p>
      <ul><li>${ic('shield')}OTPs and personal messages never leave the phone</li><li>${ic('spark')}Plain-language descriptions and categories</li><li>${ic('copies')}Duplicate alerts caught for you</li></ul>
    </div>
    <div class="art-demo">
      <div class="art-sms"><b>AD-HDFCBK · now</b>Sent Rs.450.00 from HDFC Bank A/C *4821 to zomato@hdfcbank. Ref 4301…</div>
      <div class="art-arrow">${ic('spark')} SnapTracker</div>
      <div class="art-txn"><span class="av">🍜</span><div style="flex:1"><b>Zomato</b><div style="font-size:13px;color:#5b6178">You spent ₹450 on food at Zomato.</div></div><b style="color:#c92f52">−₹450</b></div>
    </div>
  </section>
  <div class="auth-main"><div class="auth-card">${logoHtml().replace('href="#/app"', 'href="#/login"')}${inner}</div></div>
</div>`;
}

function loginView() {
  const L = S.login;
  const c = COUNTRIES.find((x) => x.code === L.cc);
  const fields = L.mode === 'email'
    ? `<label class="field"><span>Email address</span><input class="input${L.error ? ' bad' : ''}" id="l-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(L.email)}" aria-invalid="${!!L.error}" aria-describedby="l-err" required></label>`
    : `<div class="field"><span id="l-ph-l">Mobile number</span><div class="phone-row">
        <select class="input" id="l-cc" name="cc" aria-label="Country code">${COUNTRIES.map((x) => `<option value="${x.code}"${x.code === L.cc ? ' selected' : ''}>${x.flag} ${x.code}</option>`).join('')}</select>
        <input class="input${L.error ? ' bad' : ''}" id="l-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="${'9'.repeat(c.len).replace(/9{5}$/, ' 99999')}" value="${esc(L.phone)}" aria-labelledby="l-ph-l" aria-invalid="${!!L.error}" aria-describedby="l-err" required></div>
        <span class="hint">${c.name}: ${c.len} digits. Standard SMS rates may apply.</span></div>`;
  const html = authFrame(`
    <h1>Sign in to SnapTracker</h1>
    <p class="lead">Use the same email or mobile number as your SnapKhata account. We'll send a one-time code.</p>
    <div class="seg" role="tablist" aria-label="Sign in with">
      <button role="tab" type="button" aria-selected="${L.mode === 'email'}" data-act="loginMode" data-m="email">Email</button>
      <button role="tab" type="button" aria-selected="${L.mode === 'mobile'}" data-act="loginMode" data-m="mobile">Mobile</button>
    </div>
    <form data-submit="sendOtp" novalidate>
      ${fields}
      <p id="l-err" class="err" role="alert">${esc(L.error)}</p>
      <button class="btn pri wide" type="submit" ${L.busy ? 'disabled' : ''}>${L.busy ? '<span class="spin"></span>Sending code…' : 'Send one-time code'}</button>
    </form>
    <p class="proto-note">Prototype: there is no server here. The code is generated in this page, stored only as a SHA-256 hash, and shown in a "development" box on the next screen, the same way SnapKhata's dev OTP autofill works.</p>`);
  return { title: 'Sign in', html };
}

function maskId(id, channel) {
  if (channel === 'email') {
    const [u, d] = id.split('@');
    return u.slice(0, 2) + '•••@' + d;
  }
  return id.slice(0, -10).replace(/(\+\d+)/, '$1 ') + '••••• •' + id.slice(-4);
}

async function sendOtp(identifier, channel, purpose) {
  const now = Date.now();
  const sends = store.get('otpSends:' + identifier, []).filter((t) => now - t < HOUR);
  if (sends.length >= 5)
    return `Too many codes requested. Try again in ${Math.ceil((sends[0] + HOUR - now) / MIN)} min.`;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');
  const salt = randHex(8);
  S.otp = { identifier, channel, purpose, salt, hash: await sha256(salt + ':' + code), expiresAt: now + 5 * MIN, resendAt: now + 30e3, attempts: 0, devCode: code, error: '', busy: false };
  sends.push(now);
  store.set('otpSends:' + identifier, sends);
  audit(identifier, purpose === 'reset' ? 'Password reset code sent' : 'Sign-in code sent', maskId(identifier, channel));
  return null;
}

function otpView() {
  const o = S.otp;
  const left = o.expiresAt - Date.now();
  const html = authFrame(`
    <h1>${o.purpose === 'reset' ? 'Verify it\'s you' : 'Enter the 6-digit code'}</h1>
    <p class="lead">We sent a code to <b>${esc(maskId(o.identifier, o.channel))}</b>. ${o.purpose === 'reset' ? 'After this you can set a new app password.' : ''}</p>
    ${o.devCode ? `<div class="dev-code" role="note"><span>Development mode. Code: <b>${o.devCode}</b></span><button class="btn sm" type="button" data-act="fillOtp">Fill in</button></div>` : ''}
    <form data-submit="verifyOtp" novalidate>
      <fieldset style="border:0;padding:0;margin:0"><legend class="sr">One-time code</legend>
      <div class="otp${o.error ? ' bad' : ''}" id="otp">${[0, 1, 2, 3, 4, 5].map((i) => `<input id="otp${i}" class="otp-box" type="text" inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" maxlength="1" pattern="[0-9]" aria-label="Digit ${i + 1} of 6" ${o.attempts >= 5 || left <= 0 ? 'disabled' : ''}>`).join('')}</div></fieldset>
      <p class="err" role="alert" id="otp-err">${esc(o.error)}</p>
      <p class="hint" style="margin-bottom:14px"><span data-tick="expiry">${left > 0 ? `Code expires in ${mmss(left)}` : 'This code has expired.'}</span></p>
      <button class="btn pri wide" type="submit" ${o.busy || o.attempts >= 5 || left <= 0 ? 'disabled' : ''}>${o.busy ? '<span class="spin"></span>Verifying…' : 'Verify'}</button>
      <div class="row between" style="margin-top:8px">
        <button class="link" type="button" data-act="resendOtp" data-tick="resend" ${Date.now() < o.resendAt ? 'disabled' : ''}>${Date.now() < o.resendAt ? `Resend code in ${mmss(o.resendAt - Date.now())}` : 'Resend code'}</button>
        <button class="link" type="button" data-act="changeId">${o.purpose === 'reset' ? 'Back' : 'Use a different email or number'}</button>
      </div>
    </form>
    <p class="proto-note">Rules shown here: code valid 5 minutes, 5 wrong tries per code, a new code only after 30 seconds, at most 5 codes an hour. On the real API the code is checked server-side and only its hash is stored.</p>`);
  return { title: 'Verify code', html, after: () => document.getElementById('otp0')?.focus() };
}

async function verifyOtp(code) {
  const o = S.otp;
  if (Date.now() > o.expiresAt)
    return fail('This code has expired. Request a new one.');
  if (o.attempts >= 5)
    return fail('Too many wrong attempts. Request a new code.');
  if (!/^\d{6}$/.test(code))
    return fail('Enter all 6 digits.');
  o.busy = true;
  render();
  await new Promise((r) => setTimeout(r, 500));
  const ok = o.hash && (await sha256(o.salt + ':' + code)) === o.hash;
  o.busy = false;
  if (!ok) {
    o.attempts++;
    audit(o.identifier, 'Wrong code entered', `${o.attempts} of 5`);
    return fail(o.attempts >= 5 ? 'Too many wrong attempts. Request a new code.' : `That code is not right. ${5 - o.attempts} ${5 - o.attempts === 1 ? 'try' : 'tries'} left.`, true);
  }
  o.hash = null;
  if (o.purpose === 'reset') {
    S.resetOk = true;
    audit(S.user, 'Identity verified for password reset');
    S.otp = null;
    return go('/password?mode=reset', true);
  }
  const id = o.identifier;
  S.otp = null;
  const all = accounts();
  if (!all[id]) {
    all[id] = { channel: o.channel, createdAt: Date.now(), pw: null, skipped: false };
    store.set('accounts', all);
  }
  loadUser(id);
  S.locked = false;
  store.set('session', { user: id, exp: Date.now() + 30 * DAY });
  audit(id, 'Signed in with one-time code', o.channel === 'email' ? 'Email' : 'Mobile');
  go('/app', true);

  function fail(message, shake) {
    o.error = message;
    o.busy = false;
    render();
    if (shake) {
      const el = document.getElementById('otp');
      el?.classList.add('shake');
    }
  }
}

function pwRules(p) {
  const rules = [
    ['At least 8 characters', p.length >= 8],
    ['Upper and lower case letters', /[a-z]/.test(p) && /[A-Z]/.test(p)],
    ['At least one number', /\d/.test(p)],
    ['At least one symbol', /[^A-Za-z0-9]/.test(p)],
  ];
  const common = /^(password|12345678|qwerty|snaptracker|11111111)/i.test(p);
  let score = rules.filter((r) => r[1]).length + (p.length >= 12 ? 1 : 0);
  if (common)
    score = Math.min(score, 1);
  if (!p)
    score = 0;
  return { rules, score, ok: rules.every((r) => r[1]) && !common, common };
}
const STRENGTH = [['', 'var(--line)'], ['Weak', 'var(--debit)'], ['Fair', '#f97316'], ['Good', 'var(--warn)'], ['Strong', 'var(--credit)'], ['Excellent', 'var(--credit)']];

function passwordView() {
  const mode = S.route.query.mode || 'setup';
  const acc = account();
  const head = mode === 'reset' ? ['Set a new app password', 'Your identity is verified. Choose a new password to unlock SnapTracker.'] : mode === 'change' ? ['Change app password', 'Enter your current password, then the new one.'] : ['Protect SnapTracker', 'Create an app password. SnapTracker asks for it every time you open the app or after a period of inactivity, so nobody else can see your money.'];
  const eye = (id) => `<button type="button" class="eye" data-act="peek" data-for="${id}" aria-label="Show password" aria-pressed="false">${ic('eye')}</button>`;
  const html = authFrame(`
    <div class="lock-face">${ic('lock')}</div>
    <h1 style="margin-top:18px">${head[0]}</h1><p class="lead">${head[1]}</p>
    <form data-submit="setPassword" data-mode="${mode}" novalidate>
      ${mode === 'change' ? `<label class="field"><span>Current app password</span><div class="pw-wrap"><input class="input" id="pw-cur" name="cur" type="password" autocomplete="current-password" required>${eye('pw-cur')}</div></label>` : ''}
      <label class="field"><span>New app password</span><div class="pw-wrap"><input class="input" id="pw-new" name="pw" type="password" autocomplete="new-password" aria-describedby="pw-rules" required>${eye('pw-new')}</div></label>
      <div class="meter" id="pw-meter" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
      <p class="hint" id="pw-strength" aria-live="polite">Password strength: –</p>
      <ul class="rules" id="pw-rules">${pwRules('').rules.map(([l]) => `<li>${ic('checkC')}${l}</li>`).join('')}</ul>
      <label class="field"><span>Confirm app password</span><div class="pw-wrap"><input class="input" id="pw-conf" name="conf" type="password" autocomplete="new-password" required>${eye('pw-conf')}</div></label>
      <p class="err" role="alert" id="pw-err"></p>
      <button class="btn pri wide" type="submit" id="pw-save">Save app password</button>
      ${mode === 'setup' ? '<button class="btn ghost wide" type="button" data-act="skipPassword" style="margin-top:8px">Skip for now</button>' : `<button class="btn ghost wide" type="button" data-act="cancelPassword" style="margin-top:8px">Cancel</button>`}
    </form>
    <p class="proto-note">Prototype: hashed here with PBKDF2-SHA-256 and a random salt, never stored in plain text. The real API hashes with Argon2id on the server; the Android app keeps only a session token in the Android Keystore.</p>`);
  return { title: head[0], html, after: () => document.getElementById(mode === 'change' ? 'pw-cur' : 'pw-new')?.focus() };
}

function lockView() {
  const acc = account();
  const fails = S.lockFails;
  const html = authFrame(`
    <div class="lock-face">${ic('lock')}</div>
    <h1 style="margin-top:18px">SnapTracker is locked</h1>
    <p class="lead">Signed in as <b>${esc(maskId(S.user, acc.channel))}</b>. Enter your app password to continue.</p>
    <form data-submit="unlock" novalidate>
      <label class="field"><span>App password</span><div class="pw-wrap"><input class="input${S.ui.lockErr ? ' bad' : ''}" id="lk-pw" name="pw" type="password" autocomplete="current-password" required ${fails >= 5 ? 'disabled' : ''}><button type="button" class="eye" data-act="peek" data-for="lk-pw" aria-label="Show password" aria-pressed="false">${ic('eye')}</button></div></label>
      <p class="err" role="alert">${esc(S.ui.lockErr || '')}</p>
      <button class="btn pri wide" type="submit" ${fails >= 5 ? 'disabled' : ''}>Unlock</button>
    </form>
    ${S.data.settings.biometric ? `<button class="bio" type="button" data-act="biometric">${ic('finger')}<span><b>Use fingerprint or face</b><br><small class="muted">Biometric unlock on this device</small></span></button>` : ''}
    <div class="row between" style="margin-top:10px"><button class="link" type="button" data-act="forgotPw">Forgot app password?</button><button class="link" type="button" data-act="logout">Sign out</button></div>
    <p class="proto-note">Locks automatically after ${S.data.settings.autoLock ? S.data.settings.autoLock + ' min' : 'never'} of inactivity (Settings). 5 wrong tries forces recovery with a one-time code.</p>
    ${S.ui.modal ? modalHtml() : ''}`);
  return { title: 'Locked', html, after: () => document.getElementById('lk-pw')?.focus() };
}

// #endregion

// #region Dashboard

const live = (D) => D.txns.filter((t) => t.status !== 'ignored' && t.status !== 'duplicate');
const sum = (list) => list.reduce((a, t) => a + t.amount, 0);

function monthRows(D, n) {
  const rows = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    const list = live(D).filter((t) => t.at >= s && t.at < e);
    rows.push({ label: MON[new Date(s).getMonth()], full: `${MON[new Date(s).getMonth()]} ${new Date(s).getFullYear()}`, spend: sum(list.filter((t) => t.type === 'debit')), income: sum(list.filter((t) => t.type === 'credit')) });
  }
  return rows;
}

function niceMax(v) {
  if (v <= 0)
    return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function barChart(rows) {
  const W = 640, H = 240, L = 56, R = 8, T = 10, B = 28, iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(...rows.flatMap((r) => [r.spend, r.income])));
  const gw = iw / rows.length, bw = Math.min(24, gw / 3.4);
  let s = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + ih - (ih * i) / 4;
    s += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${moneyShort((max * i) / 4)}</text>`;
  }
  rows.forEach((r, i) => {
    const x0 = L + gw * i + gw / 2, hs = (ih * r.spend) / max, hi = (ih * r.income) / max;
    s += `<g class="bar-g" tabindex="0" role="img" aria-label="${r.full}: spent ${money(r.spend)}, income ${money(r.income)}"><title>${r.full}: spent ${money(r.spend)}, income ${money(r.income)}</title>
      <rect class="hit" x="${x0 - gw / 2 + 4}" y="${T}" width="${gw - 8}" height="${ih}" fill="transparent" rx="8"/>
      <rect x="${x0 - bw - 2}" y="${T + ih - hs}" width="${bw}" height="${Math.max(hs, 1)}" rx="5" fill="var(--chart-a)"/>
      <rect x="${x0 + 2}" y="${T + ih - hi}" width="${bw}" height="${Math.max(hi, 1)}" rx="5" fill="var(--chart-b)"/>
      <text x="${x0}" y="${H - 8}" text-anchor="middle">${r.label}</text></g>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Spending and income by month">${s}</svg>`;
}

function donut(D, from) {
  const list = live(D).filter((t) => t.type === 'debit' && t.at >= from);
  const by = {};
  list.forEach((t) => (by[t.category] = (by[t.category] || 0) + t.amount));
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const total = sum(list);
  if (!total)
    return '<p class="empty">No spending this month yet.</p>';
  const top = rows.slice(0, 6);
  if (rows.length > 6)
    top.push(['other', rows.slice(6).reduce((a, r) => a + r[1], 0) + (top.find((r) => r[0] === 'other')?.[1] || 0)]);
  const merged = top.filter((r, i, arr) => arr.findIndex((x) => x[0] === r[0]) === i);
  const C = 2 * Math.PI * 58;
  let off = 0;
  const arcs = merged.map(([k, v]) => {
    const len = (v / total) * C;
    const a = `<circle cx="75" cy="75" r="58" fill="none" stroke="${CATS[k].color}" stroke-width="20" stroke-dasharray="${Math.max(len - 2, 0.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)"><title>${CATS[k].name}: ${money(Math.round(v))}</title></circle>`;
    off += len;
    return a;
  }).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 150 150" width="150" height="150" role="img" aria-label="Spending by category this month">
      <circle cx="75" cy="75" r="58" fill="none" stroke="var(--grid)" stroke-width="20"/>${arcs}
      <text x="75" y="70" text-anchor="middle" style="fill:var(--faint);font-size:11px;font-weight:600">This month</text>
      <text x="75" y="90" text-anchor="middle" style="fill:var(--text);font-size:17px;font-weight:800">${moneyShort(total)}</text></svg>
    <ul>${merged.map(([k, v]) => `<li><i style="background:${CATS[k].color}"></i><span>${CATS[k].emoji} ${CATS[k].name}</span><b class="num">${Math.round((v / total) * 100)}%</b></li>`).join('')}</ul></div>`;
}

function spendLine(D) {
  const now = new Date(), mStart = startOfMonth(Date.now());
  const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const debits = live(D).filter((t) => t.type === 'debit');
  const cum = (start, upto) => {
    const out = [];
    let acc = 0;
    for (let d = 0; d < upto; d++) {
      const s = start + d * DAY;
      acc += sum(debits.filter((t) => t.at >= s && t.at < s + DAY));
      out.push(acc);
    }
    return out;
  };
  const cur = cum(mStart, now.getDate()), prev = cum(pStart, days);
  const max = niceMax(Math.max(...cur, ...prev, 1));
  const W = 600, H = 120;
  const pt = (arr) => arr.map((v, i) => `${((i / (days - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 8) - 2).toFixed(1)}`);
  const c = pt(cur), p = pt(prev);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:110px;margin-top:10px" role="img" aria-label="Cumulative spending this month compared with last month">
    <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <polyline points="${p.join(' ')}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>
    ${c.length > 1 ? `<polygon points="0,${H} ${c.join(' ')} ${c[c.length - 1].split(',')[0]},${H}" fill="url(#ga)"/><polyline points="${c.join(' ')}" fill="none" stroke="#fff" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` : ''}
  </svg><div class="legend" style="color:rgba(255,255,255,.85);position:relative;z-index:1"><span><i style="background:#fff"></i>This month</span><span><i style="background:rgba(255,255,255,.45)"></i>Last month</span></div>`;
}

function kpi(icon, cls, label, value, sub, href) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="card kpi"${href ? ` href="${href}"` : ''}><div class="k-top"><span>${label}</span><span class="k-ic ${cls}">${ic(icon)}</span></div><div class="k-val">${value}</div><div class="k-sub">${sub}</div></${tag}>`;
}

function dashView() {
  const D = S.data, now = Date.now();
  const L = live(D), mStart = startOfMonth(now), today = startOfDay(now);
  const prevStart = startOfMonth(mStart - DAY);
  const elapsed = now - mStart;
  const month = sum(L.filter((t) => t.type === 'debit' && t.at >= mStart));
  const prevSame = sum(L.filter((t) => t.type === 'debit' && t.at >= prevStart && t.at < prevStart + elapsed));
  const delta = prevSame ? Math.round(((month - prevSame) / prevSame) * 100) : 0;
  const todaySpend = sum(L.filter((t) => t.type === 'debit' && t.at >= today));
  const autoDebits = L.filter((t) => t.source === 'sms' && t.type === 'debit');
  const income = L.filter((t) => t.source === 'sms' && t.type === 'credit');
  const incomeMonth = sum(L.filter((t) => t.type === 'credit' && t.at >= mStart));
  const detected = D.txns.filter((t) => t.source === 'sms');
  const pending = D.txns.filter((t) => t.status === 'pending').sort((a, b) => b.at - a.at);
  const dups = D.txns.filter((t) => t.status === 'duplicate');
  const filtered = D.filtered.otp + D.filtered.promo + D.filtered.other + D.filtered.failed;
  const recent = D.txns.filter((t) => t.source === 'sms').sort((a, b) => b.createdAt - a.createdAt || b.at - a.at).slice(0, 6);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  let html = `<div class="page">
  <div class="page-head"><div><p class="eyebrow">${greet}</p><h1>Your money, tracked automatically</h1></div>
    <div class="row"><button class="btn" data-act="sync" ${D.tracking.state !== 'enabled' || S.ui.syncing ? 'disabled' : ''}>${S.ui.syncing ? '<span class="spin"></span>Syncing…' : ic('sync') + 'Sync now'}</button><button class="btn pri" data-act="addManual">${ic('plus')}Add manually</button></div></div>`;
  if (D.tracking.state !== 'enabled')
    html += statusCard();
  if (!D.txns.length) {
    html += `<section class="card empty" aria-labelledby="empty-h"><div class="e-ic">📭</div><h2 id="empty-h">No transactions yet</h2>
      <p style="max-width:520px;margin:6px auto 16px">Turn on SMS tracking and the next bank or UPI alert on your phone shows up here. In this prototype you can send test messages from the simulated device, or load five months of sample history to see the dashboard filled in.</p>
      <div class="row" style="justify-content:center"><button class="btn pri" data-act="openDevice">${ic('phone')}Open the device</button><button class="btn" data-act="seed">${ic('layers')}Load sample history</button></div></section></div>`;
    return { title: 'Dashboard', html };
  }
  html += `<div class="grid dash">
    <section class="card hero span-2" aria-labelledby="h-month">
      <div class="row between" style="position:relative;z-index:1"><p class="eyebrow" id="h-month">Spent this month · ${MON[new Date().getMonth()]} ${new Date().getFullYear()}</p>
        ${prevSame ? `<span class="chip">${ic(delta > 0 ? 'up' : 'down')}${Math.abs(delta)}% vs same days last month</span>` : ''}</div>
      <p class="big num" style="position:relative;z-index:1">${money(Math.round(month))}</p>
      <div class="hero-stats"><div>Today<b class="num">${money(Math.round(todaySpend))}</b></div><div>Income this month<b class="num">${money(Math.round(incomeMonth))}</b></div><div>Detected for you<b class="num">${detected.length}</b></div></div>
      ${spendLine(D)}
    </section>
    ${kpi('down', 'r', 'Expenses tracked automatically', money(Math.round(sum(autoDebits))), `${autoDebits.length} debits from SMS`)}
    ${kpi('up', 'g', 'Income detected', money(Math.round(sum(income))), `${income.length} credits from SMS`)}
    ${kpi('wallet', '', "Today's spending", money(Math.round(todaySpend)), `${L.filter((t) => t.type === 'debit' && t.at >= today).length} payments today`)}
    ${kpi('spark', '', 'Auto-detected transactions', String(detected.length), `${D.txns.filter((t) => t.status === 'auto').length} auto-approved · ${D.txns.length - detected.length} manual`, '#/app/transactions?f=sms')}
    ${kpi('alert', 'y', 'Needs verification', String(pending.length), pending.length ? 'Tap to review' : 'All caught up', '#/app/transactions?f=pending')}
    ${kpi('copies', 'p', 'Duplicate messages caught', String(dups.length), `${filtered} OTP / promo / other SMS ignored on the phone`, '#/app/transactions?f=dup')}
    <section class="card span-2" aria-labelledby="h-monthly"><div class="card-head"><div><h2 id="h-monthly">Monthly analytics</h2><p>Last 6 months, confirmed and pending</p></div>
      <div class="legend"><span><i style="background:var(--chart-a)"></i>Spent</span><span><i style="background:var(--chart-b)"></i>Income</span></div></div>${barChart(monthRows(D, 6))}</section>
    <section class="card span-2" aria-labelledby="h-cat"><div class="card-head"><div><h2 id="h-cat">Where it went</h2><p>Spending by category, this month</p></div></div>${donut(D, mStart)}</section>
    <section class="card span-2" aria-labelledby="h-queue"><div class="card-head"><div><h2 id="h-queue">Needs your check</h2><p>SnapTracker wasn't sure about these</p></div>${pending.length ? `<a class="btn sm" href="#/app/transactions?f=pending">See all ${pending.length}</a>` : ''}</div>
      ${pending.length ? pending.slice(0, 4).map((t) => `<div class="queue-item"><span class="av" style="background:${CATS[t.category].color}22">${CATS[t.category].emoji}</span><div class="tx-main" data-act="openTx" data-id="${t.id}" role="button" tabindex="0"><div class="tx-title"><span>${esc(t.merchant || (t.type === 'credit' ? 'Money received' : 'Unknown merchant'))}</span></div><div class="tx-desc">${esc(t.description)}</div></div><b class="num ${t.type}">${t.type === 'debit' ? '−' : '+'}${money(t.amount)}</b>
        <button class="btn sm icon ok" data-act="confirm" data-id="${t.id}" aria-label="Confirm ${esc(t.merchant || 'transaction')}">${ic('check')}</button><button class="btn sm icon" data-act="ignore" data-id="${t.id}" aria-label="Ignore ${esc(t.merchant || 'transaction')}">${ic('x')}</button></div>`).join('') : '<p class="empty">Nothing to review. 🎉</p>'}</section>
    <section class="card span-2" aria-labelledby="h-recent"><div class="card-head"><div><h2 id="h-recent">Recently detected</h2><p>Newest SMS first</p></div><a class="btn sm" href="#/app/transactions?f=sms">View all</a></div>
      <ul class="tl">${recent.map(txRow).join('')}</ul></section>
  </div></div>`;
  return { title: 'Dashboard', html };
}

function statusCard() {
  const st = S.data.tracking.state;
  if (st === 'paused')
    return `<section class="card status-card" style="margin-bottom:14px" aria-labelledby="sc-h"><span class="s-ic" style="background:var(--warn-bg);color:var(--warn)">${ic('pause')}</span><div class="s-body"><h2 id="sc-h">Tracking is paused</h2><p class="muted">New bank SMS are not read until you resume. Nothing is queued while paused.</p></div><button class="btn pri" data-act="resume">${ic('play')}Resume tracking</button></section>`;
  return `<section class="card status-card" style="margin-bottom:14px" aria-labelledby="sc-h"><span class="s-ic">${ic('sms')}</span><div class="s-body"><h2 id="sc-h">Turn on automatic SMS tracking</h2><p class="muted">SnapTracker needs permission to read incoming bank and UPI alerts on your Android phone. OTPs and personal messages are never read.</p></div><button class="btn pri" data-act="enableTracking">${ic('shield')}Turn on tracking</button></section>`;
}

// #endregion

// #region Transactions

const STATUS = {
  pending: ['y', 'Needs verification'], confirmed: ['g', 'Confirmed'], auto: ['b', 'Auto-approved'], ignored: ['', 'Ignored'], duplicate: ['p', 'Duplicate'],
};
const FILTERS = [
  ['all', 'All', () => true], ['sms', 'Automatically detected', (t) => t.source === 'sms'], ['manual', 'Manually added', (t) => t.source === 'manual'],
  ['pending', 'Pending verification', (t) => t.status === 'pending'], ['credit', 'Credit', (t) => t.type === 'credit' && !['ignored', 'duplicate'].includes(t.status)],
  ['debit', 'Debit', (t) => t.type === 'debit' && !['ignored', 'duplicate'].includes(t.status)], ['dup', 'Duplicates', (t) => t.status === 'duplicate'], ['ignored', 'Ignored', (t) => t.status === 'ignored'],
];

function txRow(t) {
  const c = CATS[t.category], [cls, label] = STATUS[t.status];
  const dim = t.status === 'ignored' || t.status === 'duplicate';
  return `<li><button class="tx${dim ? ' dim' : ''}" data-act="openTx" data-id="${t.id}">
    <span class="av" style="background:${c.color}22">${c.emoji}</span>
    <span class="tx-main"><span class="tx-title"><span>${esc(t.merchant || (t.type === 'credit' ? 'Money received' : 'Unknown merchant'))}</span></span>
      <span class="tx-desc">${esc(t.description)}</span>
      <span class="tx-meta"><span>${fmtTime(t.at)}</span>·<span>${esc(t.method)}</span>·<span>${t.source === 'sms' ? '⚡ SMS' : '✍️ Manual'}</span>${t.khata ? '·<span>📒 Khata</span>' : ''}</span></span>
    <span class="tx-amt"><b class="${t.type}">${t.type === 'debit' ? '−' : '+'}${money(t.amount)}</b><small class="chip ${cls}">${label}</small></span></button></li>`;
}

function txnsView() {
  const D = S.data;
  const f = S.route.query.f || S.ui.filter;
  S.ui.filter = f;
  const q = S.ui.search.trim().toLowerCase();
  const fn = (FILTERS.find((x) => x[0] === f) || FILTERS[0])[2];
  const list = D.txns.filter(fn).filter((t) => !q || [t.merchant, t.description, CATS[t.category].name, t.method, t.sms?.body, String(t.amount)].some((v) => v && String(v).toLowerCase().includes(q))).sort((a, b) => b.at - a.at);
  const groups = [];
  list.forEach((t) => {
    const k = relDay(t.at);
    let g = groups[groups.length - 1];
    if (!g || g.k !== k)
      groups.push((g = { k, items: [], net: 0 }));
    g.items.push(t);
    if (!['ignored', 'duplicate'].includes(t.status))
      g.net += t.type === 'debit' ? -t.amount : t.amount;
  });
  const html = `<div class="page">
    <div class="page-head"><div><p class="eyebrow">SnapTracker</p><h1>Detected transactions</h1></div>
      <div class="row"><label class="search"><span class="sr">Search transactions</span>${ic('search')}<input class="input" id="tx-search" type="search" placeholder="Search merchant, amount, SMS…" value="${esc(S.ui.search)}"></label><button class="btn pri" data-act="addManual">${ic('plus')}Add</button></div></div>
    <div class="filters" role="group" aria-label="Filter transactions">${FILTERS.map(([k, label, ff]) => `<button aria-pressed="${k === f}" data-act="filter" data-f="${k}">${label} <small>${D.txns.filter(ff).length}</small></button>`).join('')}</div>
    ${list.length ? `<div class="card list-card"><ul class="tl">${groups.map((g) => `<li><div class="tl-day"><span>${g.k}</span><span class="num">${g.net >= 0 ? '+' : '−'}${money(Math.abs(Math.round(g.net)))}</span></div><ul class="tl">${g.items.map(txRow).join('')}</ul></li>`).join('')}</ul></div>`
      : `<div class="card empty"><div class="e-ic">🔍</div><p>${D.txns.length ? 'No transactions match this filter.' : 'No transactions yet. Send a test SMS from the device panel.'}</p>
        <div class="row" style="justify-content:center;margin-top:12px">${f !== 'all' && D.txns.length ? '<button class="btn" data-act="filter" data-f="all">Show all transactions</button>' : ''}${D.sampleLoaded ? '' : `<button class="btn pri" data-act="seed">${ic('layers')}Load sample transactions</button>`}</div></div>`}
  </div>`;
  return { title: 'Detected transactions', html };
}

function highlight(sms) {
  let h = esc(sms.body);
  (sms.marks || []).forEach((m) => {
    const e = esc(m);
    const i = h.indexOf(e);
    if (i >= 0 && !h.slice(0, i).endsWith('<mark>'))
      h = h.slice(0, i) + '<mark>' + e + '</mark>' + h.slice(i + e.length);
  });
  return h;
}

function drawerHtml() {
  const D = S.data, t = D.txns.find((x) => x.id === S.ui.drawer);
  if (!t)
    return '';
  const c = CATS[t.category], [cls, label] = STATUS[t.status];
  const dupOf = t.dupOf ? D.txns.find((x) => x.id === t.dupOf) : null;
  const confColor = t.confidence >= 85 ? 'var(--credit)' : t.confidence >= 65 ? 'var(--warn)' : 'var(--debit)';
  let banner = '';
  if (t.status === 'pending')
    banner = `<div class="alert warn">${ic('alert')}<span>${t.typeGuessed ? 'SnapTracker could not tell whether money came in or went out.' : `SnapTracker is ${t.confidence}% sure about this one.`} Check the details and confirm, or edit.</span></div>`;
  if (t.status === 'duplicate')
    banner = `<div class="alert info">${ic('copies')}<span>${esc(t.dupWhy)} ${dupOf ? `It matches <button class="link" style="min-height:0;padding:0" data-act="openTx" data-id="${dupOf.id}">${esc(dupOf.merchant || 'this transaction')} on ${fmtDate(dupOf.at)}</button>.` : ''} It is not counted in your totals.</span></div>`;
  if (t.status === 'ignored')
    banner = `<div class="alert info">${ic('info')}<span>Ignored. Not counted in totals and removed from Khata.</span></div>`;
  const actions = [];
  if (t.status === 'pending')
    actions.push(`<button class="btn pri" data-act="confirm" data-id="${t.id}">${ic('check')}Confirm</button>`);
  if (t.status === 'duplicate')
    actions.push(`<button class="btn" data-act="notDup" data-id="${t.id}">Not a duplicate</button>`);
  actions.push(`<button class="btn" data-act="edit" data-id="${t.id}">${ic('edit')}Edit</button>`);
  actions.push(`<button class="btn" data-act="pickCat" data-id="${t.id}">${ic('tag')}Category</button>`);
  actions.push(t.status === 'ignored' ? `<button class="btn" data-act="restore" data-id="${t.id}">Restore</button>` : t.status !== 'duplicate' ? `<button class="btn" data-act="ignore" data-id="${t.id}">${ic('x')}Ignore</button>` : '');
  actions.push(`<button class="btn danger" data-act="askDelete" data-id="${t.id}">${ic('trash')}Delete</button>`);
  return `<div class="scrim" data-act="closeDrawer"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="d-title">
    <div class="drawer-head"><h2 id="d-title">Transaction details</h2><button class="btn ghost icon" data-act="closeDrawer" aria-label="Close">${ic('x')}</button></div>
    <div class="drawer-body">
      <div class="d-hero"><span class="av" style="background:${c.color}22">${c.emoji}</span><div style="min-width:0"><b style="font-size:17px">${esc(t.merchant || (t.type === 'credit' ? 'Money received' : 'Unknown merchant'))}</b><div class="row" style="gap:6px;margin-top:4px"><span class="chip">${c.name}</span><span class="chip ${cls}">${label}</span>${t.edited ? '<span class="chip">Edited</span>' : ''}</div></div></div>
      <p class="d-amt ${t.type}">${t.type === 'debit' ? '−' : '+'}${money(t.amount)} <span class="chip ${t.type === 'debit' ? 'r' : 'g'}" style="vertical-align:middle">${t.type === 'debit' ? 'Debit · expense' : 'Credit · income'}</span></p>
      <div style="margin-top:14px">${banner}</div>
      <div class="ai"><p>${ic('spark')}DESCRIPTION${t.edited ? ' (edited)' : ' · GENERATED'}</p><p>${esc(t.description)}</p>${t.note ? `<p class="muted" style="margin-top:6px;font-size:13px">Note: ${esc(t.note)}</p>` : ''}</div>
      <dl class="d-grid">
        <div><dt>Date & time</dt><dd>${fmtDT(t.at)}</dd></div>
        <div><dt>Payment method</dt><dd>${esc(t.method)}</dd></div>
        <div><dt>Account</dt><dd>${esc(t.account || '—')}</dd></div>
        <div><dt>Reference</dt><dd>${esc(t.ref || '—')}</dd></div>
        <div><dt>Source</dt><dd>${t.source === 'sms' ? `Automatically detected through SnapTracker · ${esc(t.sms.senderName)}` : 'Added manually'}</dd></div>
        <div><dt>Khata</dt><dd>${t.khata ? `📒 ${esc(t.khata.book)} · ${t.khata.no}<br><small class="muted">${t.khata.kind}</small>` : t.status === 'pending' ? 'Posts when confirmed' : '—'}</dd></div>
        ${t.source === 'sms' ? `<div style="grid-column:1/-1"><dt>Detection confidence · ${t.confidence}%</dt><dd><div class="conf"><i style="width:${t.confidence}%;background:${confColor}"></i></div></dd></div>` : ''}
      </dl>
      ${t.sms ? `<div class="sms-head"><span>Original SMS · ${esc(t.sms.sender)}</span><span>${fmtDT(t.sms.receivedAt)}</span></div><div class="sms">${highlight(t.sms)}</div><p class="hint" style="margin-top:6px">Highlighted: the parts SnapTracker read. You can delete original texts any time in Privacy.</p>` : t.source === 'sms' ? '<p class="hint" style="margin-top:14px">Original SMS text deleted at your request.</p>' : ''}
    </div>
    <div class="drawer-foot">${actions.join('')}</div>
  </aside>`;
}

// #endregion

// #region Modals

function modalHtml() {
  const m = S.ui.modal;
  let body = '';
  if (m.kind === 'confirm')
    body = `<h2 id="m-title">${esc(m.title)}</h2><p class="muted">${esc(m.body)}</p>
      <div class="modal-actions"><button class="btn" data-act="closeModal">Cancel</button><button class="btn ${m.danger ? 'danger solid' : 'pri'}" data-act="${m.act}" data-id="${m.id ?? ''}">${esc(m.ok)}</button></div>`;
  else if (m.kind === 'disclosure')
    body = `<h2 id="m-title">SnapTracker reads bank SMS</h2>
      <p class="muted" style="margin-bottom:12px">To create transactions automatically, SnapTracker needs the Android SMS permission. Here is exactly what happens:</p>
      <ul class="ticks yes" style="margin-bottom:12px"><li>${ic('checkC')}Only messages from banks and payment apps on our list are looked at.</li><li>${ic('checkC')}For those, the text, sender and time are sent over HTTPS to your SnapTracker account to create a transaction.</li><li>${ic('checkC')}You can pause, revoke or delete everything at any time.</li></ul>
      <ul class="ticks no" style="margin-bottom:14px"><li>${ic('xC')}OTPs, personal chats and promotions are dropped on the phone and never uploaded.</li><li>${ic('xC')}No contacts, call logs or other phone data are collected.</li><li>${ic('xC')}Your inbox history is not uploaded in bulk.</li></ul>
      <label class="row" style="gap:10px;align-items:flex-start;min-height:44px"><input type="checkbox" id="consent" style="width:20px;height:20px;margin-top:2px;accent-color:var(--brand)"> <span>I understand and want SnapTracker to read bank and UPI SMS on this phone.</span></label>
      <div class="modal-actions"><button class="btn" data-act="closeModal">Not now</button><button class="btn pri" data-act="consentNext">Continue</button></div>`;
  else if (m.kind === 'android')
    return `<div class="scrim"></div><div class="modal"><div class="modal-box android" role="dialog" aria-modal="true" aria-labelledby="m-title" style="width:min(340px,100%)">
      <div class="a-ic">${ic('sms')}</div><h2 id="m-title">Allow <b>SnapTracker</b> to send and view SMS messages?</h2>
      <div class="a-btns"><button class="allow" data-act="permAllow">Allow</button><button data-act="permDeny">Don't allow</button></div>
      <p style="font-size:11px;margin-top:12px;opacity:.6">Prototype of the Android system dialog (RECEIVE_SMS)</p></div></div>`;
  else if (m.kind === 'biometric')
    body = `<h2 id="m-title" style="text-align:center">Unlock SnapTracker</h2><div class="fp${m.done ? ' done' : ''}">${ic(m.done ? 'check' : 'finger')}</div><p class="muted" style="text-align:center">${m.done ? 'Recognised' : 'Touch the fingerprint sensor'}</p>
      <p class="hint" style="text-align:center;margin-top:8px">Prototype: simulated. The Android app uses BiometricPrompt with a key in the Android Keystore.</p>
      <div class="modal-actions" style="justify-content:center"><button class="btn" data-act="closeModal">Use password</button></div>`;
  else if (m.kind === 'category') {
    const t = S.data.txns.find((x) => x.id === m.id);
    body = `<h2 id="m-title">Change category</h2><p class="muted" style="margin-bottom:12px">${esc(t.merchant || 'This transaction')} · ${money(t.amount)}</p>
      <div class="cat-grid">${Object.entries(CATS).map(([k, c]) => `<button aria-pressed="${k === t.category}" data-act="setCat" data-id="${t.id}" data-c="${k}">${c.emoji} ${c.name}</button>`).join('')}</div>
      ${t.merchant ? `<label class="row" style="gap:10px;margin-top:14px;min-height:44px"><input type="checkbox" id="cat-rule" checked style="width:20px;height:20px;accent-color:var(--brand)"> Always use this category for ${esc(t.merchant)}</label>` : ''}
      <div class="modal-actions"><button class="btn" data-act="closeModal">Close</button></div>`;
  } else if (m.kind === 'edit')
    body = editForm(m.id);
  return `<div class="scrim" data-act="closeModal"></div><div class="modal"><div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="m-title">${body}</div></div>`;
}

function editForm(id) {
  const t = id ? S.data.txns.find((x) => x.id === id) : null;
  const v = t || { type: 'debit', amount: '', merchant: '', category: 'food', method: 'UPI', at: Date.now(), description: '', note: '' };
  const d = new Date(v.at);
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `<h2 id="m-title">${t ? 'Edit transaction' : 'Add a transaction'}</h2>
  <form data-submit="saveTxn" data-id="${t ? t.id : ''}" novalidate>
    <div class="seg" role="radiogroup" aria-label="Direction"><button type="button" role="radio" aria-selected="${v.type === 'debit'}" aria-checked="${v.type === 'debit'}" data-act="editType" data-t="debit">Debit · money out</button><button type="button" role="radio" aria-selected="${v.type === 'credit'}" aria-checked="${v.type === 'credit'}" data-act="editType" data-t="credit">Credit · money in</button></div>
    <input type="hidden" name="type" id="e-type" value="${v.type}">
    <div class="two">
      <label class="field"><span>Amount (₹)</span><input class="input" name="amount" id="e-amt" type="number" inputmode="decimal" min="1" step="0.01" required value="${v.amount}"></label>
      <label class="field"><span>Date & time</span><input class="input" name="at" type="datetime-local" required value="${local}"></label>
      <label class="field"><span>Merchant / person</span><input class="input" name="merchant" maxlength="60" value="${esc(v.merchant || '')}"></label>
      <label class="field"><span>Category</span><select class="input" name="category">${Object.entries(CATS).map(([k, c]) => `<option value="${k}"${k === v.category ? ' selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}</select></label>
      <label class="field"><span>Payment method</span><select class="input" name="method">${METHODS.map((x) => `<option${x === v.method ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Khata book</span><select class="input" name="book">${BOOKS.map((b) => `<option${b === (t?.khata?.book || S.data.settings.khata.book) ? ' selected' : ''}>${b}</option>`).join('')}</select></label>
    </div>
    <label class="field"><span>Description</span><textarea class="input" name="description" maxlength="200" placeholder="Leave empty to generate one">${esc(t && t.edited ? t.description : t ? t.description : '')}</textarea></label>
    <label class="field"><span>Note (optional)</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}"></label>
    <p class="err" role="alert" id="e-err"></p>
    <div class="modal-actions"><button class="btn" type="button" data-act="closeModal">Cancel</button>${t && t.status === 'pending' ? '<button class="btn" type="submit" name="confirm" value="0">Save</button><button class="btn pri" type="submit" name="confirm" value="1">Save & confirm</button>' : '<button class="btn pri" type="submit">Save</button>'}</div>
  </form>`;
}

// #endregion

// #region Privacy, notifications, settings, how it works

function privacyView() {
  const D = S.data, st = D.tracking.state, s = trackState();
  const f = D.filtered;
  const withText = D.txns.filter((t) => t.sms).length;
  const html = `<div class="page">
  <div class="page-head"><div><p class="eyebrow">Permissions & privacy</p><h1>You control what SnapTracker reads</h1></div></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
    <section class="card" aria-labelledby="pv-track">
      <div class="set-row"><div class="lbl"><b id="pv-track">SMS tracking</b><small>Reads new bank and UPI alerts on this phone</small></div><label class="sw"><input type="checkbox" data-change="trackSwitch" ${st === 'enabled' ? 'checked' : ''} aria-labelledby="pv-track"><span></span></label></div>
      <div class="set-row"><div class="lbl"><b>Status</b><small>${st === 'enabled' ? `Since ${fmtDT(D.tracking.since)}` : st === 'paused' ? 'Permission kept, reading stopped' : 'Android SMS permission not granted'}</small></div><span class="status ${s.cls}"><span class="dot"></span>${s.label}</span></div>
      <div class="row" style="margin-top:12px">
        ${st === 'enabled' ? `<button class="btn" data-act="pause">${ic('pause')}Pause tracking</button>` : st === 'paused' ? `<button class="btn pri" data-act="resume">${ic('play')}Resume</button>` : `<button class="btn pri" data-act="enableTracking">${ic('shield')}Turn on</button>`}
        ${st !== 'permission' ? `<button class="btn danger" data-act="askRevoke">Revoke SMS access</button>` : ''}
      </div>
    </section>
    <section class="card" aria-labelledby="pv-why"><h2 id="pv-why" style="margin-bottom:8px">Why SMS access?</h2>
      <p class="muted">Banks and UPI apps send an SMS for every payment. Reading those alerts is the only way to record your spending without you typing it in. A website cannot read SMS, so this works through the SnapTracker Android app, and only after you turn it on here.</p></section>
    <section class="card" aria-labelledby="pv-what"><h2 id="pv-what" style="margin-bottom:12px">What is processed and stored</h2>
      <ul class="ticks yes"><li>${ic('checkC')}Sender name, time and text of bank / payment-app alerts</li><li>${ic('checkC')}Amount, direction, merchant, account's last 4 digits, reference</li><li>${ic('checkC')}The transaction created from it, linked to your account only</li></ul></section>
    <section class="card" aria-labelledby="pv-never"><h2 id="pv-never" style="margin-bottom:12px">Never collected</h2>
      <ul class="ticks no"><li>${ic('xC')}OTP and verification-code messages</li><li>${ic('xC')}Personal chats and messages from phone numbers</li><li>${ic('xC')}Promotions and advertisements</li><li>${ic('xC')}Contacts, call logs, location, other apps</li><li>${ic('xC')}Your old inbox in bulk</li></ul></section>
    <section class="card" aria-labelledby="pv-flow"><h2 id="pv-flow" style="margin-bottom:12px">How a message is filtered</h2>
      <ol class="flow"><li><div><b>Sender check on the phone</b><small>Only registered bank and payment headers (e.g. AD-HDFCBK) pass.</small></div></li><li><div><b>OTP and promotion filter on the phone</b><small>OTPs and ads are dropped here and never leave the device.</small></div></li><li><div><b>Encrypted upload</b><small>HTTPS with your session token, a timestamp and a one-time nonce (no replays).</small></div></li><li><div><b>Parse, categorise, de-duplicate</b><small>On the server. Failed payments and unreadable alerts are discarded.</small></div></li></ol></section>
    <section class="card" aria-labelledby="pv-stats"><h2 id="pv-stats" style="margin-bottom:12px">Ignored on your phone so far</h2>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">${[['OTPs', f.otp], ['Promotions', f.promo], ['Failed payments', f.failed], ['Other / unknown', f.other]].map(([l, n]) => `<div style="background:var(--surface-2);border-radius:12px;padding:10px 12px"><div class="muted" style="font-size:13px">${l}</div><b class="num" style="font-size:20px">${n}</b></div>`).join('')}</div></section>
    <section class="card" aria-labelledby="pv-senders"><h2 id="pv-senders" style="margin-bottom:12px">Supported senders</h2><div class="senders">${[...new Set(Object.values(BANKS))].map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div></section>
    <section class="card" aria-labelledby="pv-data"><h2 id="pv-data" style="margin-bottom:6px">Your data</h2><p class="muted" style="margin-bottom:12px">${withText} transactions keep their original SMS text.</p>
      <div class="stack"><button class="btn" data-act="exportData">${ic('down')}Download my data (JSON)</button><button class="btn" data-act="askDeleteTexts" ${withText ? '' : 'disabled'}>Delete original SMS texts, keep transactions</button><button class="btn danger" data-act="askDeleteAll">${ic('trash')}Delete all SnapTracker data</button></div></section>
  </div></div>`;
  return { title: 'Privacy', html };
}

function notifyView() {
  const D = S.data;
  const html = `<div class="page">
  <div class="page-head"><div><p class="eyebrow">Notifications</p><h1>Alerts you want to get</h1></div><button class="btn" data-act="readAll" ${D.notes.some((n) => !n.read) ? '' : 'disabled'}>Mark all read</button></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
    <section class="card" aria-labelledby="nt-pref"><h2 id="nt-pref" style="margin-bottom:6px">Preferences</h2>
      <div class="set-row"><label for="n-push"><b>Push notifications on the phone</b><small>Off: alerts only appear inside SnapTracker</small></label><span class="sw"><input type="checkbox" id="n-push" data-change="pushPref" ${D.settings.push ? 'checked' : ''}><span></span></span></div>
      ${Object.entries(NOTE_TYPES).map(([k, n]) => `<div class="set-row"><label for="n-${k}"><b>${n.icon} ${n.label}</b><small>${n.help}</small></label><span class="sw"><input type="checkbox" id="n-${k}" data-change="notePref" data-k="${k}" ${D.settings.notify[k] ? 'checked' : ''}><span></span></span></div>`).join('')}
    </section>
    <section class="card" aria-labelledby="nt-list" style="padding:0;overflow:hidden"><div class="pop-head" style="position:static"><h2 id="nt-list">Recent</h2><span class="muted" style="font-size:13px">${D.notes.length}</span></div>${notesList(30)}</section>
  </div></div>`;
  return { title: 'Notifications', html };
}

function notesList(n) {
  const D = S.data;
  if (!D.notes.length)
    return '<p class="empty">No notifications yet.</p>';
  return D.notes.slice(0, n).map((x) => `<button class="note${x.read ? '' : ' unread'}" data-act="openNote" data-id="${x.id}"><span class="n-ic">${NOTE_TYPES[x.type]?.icon || '🔔'}</span><span style="flex:1;min-width:0"><b>${esc(x.title)}</b><span>${esc(x.body)}</span><small>${ago(x.at)}</small></span></button>`).join('');
}

function notesPanel() {
  return `<div class="pop" role="dialog" aria-label="Notifications"><div class="pop-head"><b>Notifications</b><div class="row" style="gap:2px"><button class="link" data-act="readAll">Mark all read</button><a class="link" style="display:inline-flex;align-items:center" href="#/app/notifications">Settings</a></div></div>${notesList(15)}</div>`;
}

function settingsView() {
  const D = S.data, set = D.settings, acc = account();
  const log = store.get('audit:' + S.user, []);
  const html = `<div class="page">
  <div class="page-head"><div><p class="eyebrow">Settings</p><h1>SnapTracker settings</h1></div></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
    <section class="card" aria-labelledby="st-appr"><h2 id="st-appr" style="margin-bottom:6px">Automatic approval</h2><p class="muted" style="margin-bottom:12px;font-size:14px">What happens when a new SMS becomes a transaction.</p>
      <div class="radio-cards">
        ${[['review', 'Review everything', 'Every detected transaction waits for you to confirm.'], ['smart', 'Smart (recommended)', 'Auto-approve when SnapTracker is sure; ask you about the rest.'], ['auto', 'Approve all', 'Everything is approved straight away. You can still edit later.']].map(([k, l, h]) => `<label><input type="radio" name="approval" value="${k}" data-change="approval" ${set.approval === k ? 'checked' : ''}><span><b>${l}</b><small>${h}</small></span></label>`).join('')}
      </div>
      ${set.approval === 'smart' ? `<label class="field" style="margin-top:14px"><span>Auto-approve at <b id="thr-v">${set.threshold}</b>% confidence or more</span><input type="range" min="70" max="98" step="1" value="${set.threshold}" data-change="threshold" id="thr"></label>` : ''}
    </section>
    <section class="card" aria-labelledby="st-khata"><h2 id="st-khata" style="margin-bottom:6px">SnapKhata link</h2>
      <div class="set-row"><label for="k-auto"><b>Post confirmed transactions to Khata</b><small>Debits become "You paid", credits "You got". One entry per transaction, never twice.</small></label><span class="sw"><input type="checkbox" id="k-auto" data-change="khataAuto" ${set.khata.autoPost ? 'checked' : ''}><span></span></span></div>
      <label class="field" style="margin-top:8px"><span>Default Khata book</span><select class="input" data-change="khataBook">${BOOKS.map((b) => `<option${b === set.khata.book ? ' selected' : ''}>${b}</option>`).join('')}</select></label>
      <p class="hint">${D.txns.filter((t) => t.khata).length} transactions are in Khata.</p>
    </section>
    <section class="card" aria-labelledby="st-sec"><h2 id="st-sec" style="margin-bottom:6px">Security</h2>
      <div class="set-row"><div class="lbl"><b>App password</b><small>${acc.pw ? `Set on ${fmtDate(acc.pw.at)}` : 'Not set. Anyone with your phone can open SnapTracker.'}</small></div>${acc.pw ? '<a class="btn sm" href="#/password?mode=change">Change</a>' : '<a class="btn sm pri" href="#/password?mode=setup">Create</a>'}</div>
      <div class="set-row"><label for="s-lock"><b>Auto-lock after inactivity</b><small>Asks for the app password again</small></label><select class="input" id="s-lock" style="width:auto;min-width:120px" data-change="autoLock" ${acc.pw ? '' : 'disabled'}>${[[1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes'], [0, 'Never']].map(([v, l]) => `<option value="${v}"${set.autoLock === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="set-row"><label for="s-bio"><b>Biometric unlock</b><small>Fingerprint or face on supported phones</small></label><span class="sw"><input type="checkbox" id="s-bio" data-change="biometric" ${set.biometric ? 'checked' : ''} ${acc.pw ? '' : 'disabled'}><span></span></span></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="lockNow" ${acc.pw ? '' : 'disabled'}>${ic('lock')}Lock now</button><button class="btn danger" data-act="logout">${ic('logout')}Sign out</button></div>
    </section>
    <section class="card" aria-labelledby="st-look"><h2 id="st-look" style="margin-bottom:12px">Appearance</h2>
      <div class="seg" style="grid-template-columns:repeat(3,1fr)" role="radiogroup" aria-label="Theme">${['system', 'light', 'dark'].map((th) => `<button role="radio" aria-checked="${set.theme === th}" aria-selected="${set.theme === th}" data-act="setTheme" data-t="${th}">${th[0].toUpperCase() + th.slice(1)}</button>`).join('')}</div>
      <a class="btn wide" href="#/app/how">${ic('layers')}How SnapTracker works</a>
    </section>
    <section class="card" aria-labelledby="st-audit"><h2 id="st-audit" style="margin-bottom:8px">Security activity</h2>
      <ul class="audit">${log.slice(0, 12).map((a) => `<li><span><b>${esc(a.event)}</b>${a.detail ? `<br><small class="muted">${esc(a.detail)}</small>` : ''}</span><small class="faint" style="white-space:nowrap">${fmtDT(a.at)}</small></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul></section>
    <section class="card" aria-labelledby="st-proto" style="border-style:dashed"><h2 id="st-proto" style="margin-bottom:8px">Prototype controls</h2><p class="muted" style="font-size:14px;margin-bottom:12px">Only in this prototype.</p>
      <div class="stack"><button class="btn" data-act="seed" ${D.sampleLoaded ? 'disabled' : ''}>${ic('layers')}${D.sampleLoaded ? 'Sample history loaded' : 'Load sample history'}</button><button class="btn danger" data-act="askReset">Reset everything (all accounts)</button></div></section>
  </div></div>`;
  return { title: 'Settings', html };
}

function howView() {
  const html = `<div class="page">
  <div class="page-head"><div><p class="eyebrow">Architecture</p><h1>How SnapTracker works</h1></div></div>
  <div class="alert info" style="margin-bottom:14px">${ic('info')}<span>A web page cannot read SMS. Detection runs in a small Android companion app (or the Android build of the app); the Angular site shows the dashboard, and the .NET API does the parsing and storage.</span></div>
  <div class="arch">
    <section class="card"><h3>📱 Android app</h3><ul>
      <li><code>RECEIVE_SMS</code> only, asked when you turn tracking on, with a disclosure first (Google Play SMS policy: declare the expense-tracking use).</li>
      <li>A <code>BroadcastReceiver</code> for new SMS. No inbox scan, no <code>READ_CONTACTS</code>.</li>
      <li>Phone-side filters: sender allow-list, OTP drop, promotion drop.</li>
      <li>Encrypted queue (WorkManager) for offline, uploads when online.</li>
      <li>Token in Android Keystore; BiometricPrompt for unlock.</li></ul></section>
    <section class="card"><h3>🛡️ API (.NET, Thakurg)</h3><ul>
      <li><code>POST /api/tracker/sms</code>: signed with session token + timestamp + nonce, rejected if replayed or older than 5 minutes.</li>
      <li>Parser → categoriser → describer → duplicate check (reference, same text, amount ± 10 min).</li>
      <li>OTP: hashed, 5 min, 5 tries, rate limited. App password: Argon2id.</li>
      <li>SMS text encrypted at rest; never written to logs.</li>
      <li>Controller → Service → Repository, messages from the Messages table.</li></ul></section>
    <section class="card"><h3>📒 Data and Khata</h3><ul>
      <li><code>TrackerTransactions</code> (INT Id, UserId, Type, Amount, Merchant, CategoryId, Method, AccountLast4, Ref, Status, Confidence, SmsTextEncrypted, KhataEntryId).</li>
      <li>Confirmed rows create one <code>KhataEntries</code> row each; the link prevents doubles.</li>
      <li>Ignore / delete removes the Khata entry too.</li>
      <li>Every query filtered by the signed-in user.</li></ul></section>
  </div>
  <section class="card" style="margin-top:14px" aria-labelledby="hw-flow"><h2 id="hw-flow" style="margin-bottom:12px">From SMS to transaction</h2>
    <ol class="flow"><li><div><b>SMS arrives</b><small>Android delivers it to the SnapTracker receiver, only while tracking is on.</small></div></li><li><div><b>Filtered on the phone</b><small>Unknown senders, OTPs and promotions stop here.</small></div></li><li><div><b>Uploaded over HTTPS</b><small>Only the matching message, never the inbox.</small></div></li><li><div><b>Understood</b><small>Amount, debit/credit, merchant, method, account, date, reference. Category and a plain-language description.</small></div></li><li><div><b>Checked</b><small>Duplicates are caught; unsure ones wait for you; sure ones are auto-approved (your choice in Settings).</small></div></li><li><div><b>Filed</b><small>Shows on the dashboard and posts to your Khata book once confirmed.</small></div></li></ol></section>
  <p class="hint" style="margin-top:14px">Try it: open <button class="link" data-act="openDevice" style="padding:0;min-height:0">the simulated device</button> and send the sample messages.</p>
  </div>`;
  return { title: 'How it works', html };
}

// #endregion

// #region Device simulator

function deviceHtml() {
  const D = S.data, r = S.ui.devResult, st = D.tracking.state;
  const samples = sampleMessages(S.ui.ref);
  const tagCls = { Debit: 'r', Credit: 'g', Duplicate: 'p', Review: 'y', Ignored: '' };
  return `<div class="scrim" data-act="closeDevice"></div>
  <aside class="device" role="dialog" aria-modal="true" aria-labelledby="dv-title">
    <div class="drawer-head"><h2 id="dv-title">Android device <span class="chip b">SIMULATED</span></h2><button class="btn ghost icon" data-act="closeDevice" aria-label="Close">${ic('x')}</button></div>
    <div class="drawer-body">
      <p class="hint">Stands in for the SnapTracker Android app's SMS receiver so the flow can be tried in a browser. Real detection needs the Android app.</p>
      <div class="phone"><div class="phone-screen">
        <div class="p-bar"><span>${fmtTime(Date.now())}</span><span>${st === 'enabled' ? '● SnapTracker on' : st === 'paused' ? '❚❚ paused' : '⊘ no SMS permission'}</span></div>
        ${S.ui.devNotes.length ? S.ui.devNotes.slice(0, 3).map((n) => `<div class="p-note"><b>${n.icon} ${esc(n.app)} · now</b>${esc(n.text)}</div>`).join('') : '<div class="p-empty">No notifications</div>'}
      </div></div>
      ${st !== 'enabled' ? `<div class="alert warn" style="margin:0">${ic('alert')}<span>${st === 'paused' ? 'Tracking is paused, so the receiver ignores new SMS.' : 'SMS permission is not granted, so Android does not deliver SMS to SnapTracker.'} <button class="link" style="padding:0;min-height:0" data-act="${st === 'paused' ? 'resume' : 'enableTracking'}">${st === 'paused' ? 'Resume' : 'Turn on'}</button></span></div>` : ''}
      ${r ? `<section aria-labelledby="dv-res"><h3 id="dv-res" style="font-size:15px;margin-bottom:8px">What happened</h3>
        <div class="outcome ${r.outcome}" role="status">${r.outcome === 'created' ? `✅ Created: ${esc(r.txn.merchant || 'transaction')} ${r.txn.type === 'debit' ? '−' : '+'}${money(r.txn.amount)} · ${STATUS[r.txn.status][1]}` : r.outcome === 'duplicate' ? '🧬 Caught as a duplicate. Not counted twice.' : r.outcome === 'blocked' ? '⏸️ ' + esc(r.reason) : '🚫 ' + esc(r.reason)}
          ${r.txn ? ` <button class="link" style="padding:0;min-height:0" data-act="openTx" data-id="${r.txn.id}">Open</button>` : ''}</div>
        ${r.steps.length ? `<ul class="steps" style="margin-top:10px">${r.steps.map((s) => `<li class="${s.ok ? 'ok' : 'no'}">${ic(s.ok ? 'checkC' : 'xC')}<span><b>${esc(s.label)}</b><small>${esc(s.detail)}</small></span><span class="where ${s.where}">${s.where}</span></li>`).join('')}</ul>` : ''}</section>` : ''}
      <section aria-labelledby="dv-s"><h3 id="dv-s" style="font-size:15px;margin-bottom:8px">Send a sample SMS</h3>
        <div class="samples">${samples.map((s, i) => `<button data-act="deliver" data-i="${i}"><span>${esc(s.label)}<br><small class="faint" style="font-family:var(--mono);font-weight:500">${esc(s.sms[0])}</small></span><span class="chip ${tagCls[s.tag]}">${s.tag}</span></button>`).join('')}</div></section>
      <section aria-labelledby="dv-c"><h3 id="dv-c" style="font-size:15px;margin-bottom:8px">Or write your own</h3>
        <form data-submit="deliverCustom">
          <label class="field"><span>Sender header</span><input class="input" name="sender" value="AD-HDFCBK-S" style="font-family:var(--mono)" required></label>
          <label class="field"><span>Message</span><textarea class="input" name="body" required placeholder="Rs.799.00 debited from A/c XX4821 on 31-10-26 to swiggy@icici. UPI Ref 431234567890"></textarea></label>
          <button class="btn pri wide" type="submit">${ic('sms')}Deliver SMS</button></form></section>
    </div>
  </aside>`;
}

function deliver(sender, body) {
  const D = S.data;
  const st = D.tracking.state;
  if (st !== 'enabled') {
    S.ui.devResult = { outcome: 'blocked', reason: st === 'paused' ? 'Tracking is paused. The message was not read.' : 'No SMS permission. Android never handed the message to SnapTracker.', steps: [] };
    return render();
  }
  S.ui.syncing = true;
  S.ui.devResult = null;
  render();
  setTimeout(() => {
    const r = processSms(D, { sender, body, receivedAt: Date.now() });
    S.ui.syncing = false;
    S.ui.devResult = r;
    if (r.txn) {
      const t = r.txn, a = `${t.type === 'debit' ? '−' : '+'}${money(t.amount)}`;
      if (t.status === 'duplicate')
        notify('duplicate', 'Duplicate message detected', `${a} ${t.merchant || ''} was already recorded.`, t.id);
      else {
        notify('newTx', `New transaction · ${a}`, t.description, t.id);
        if (t.status === 'auto')
          notify('categorized', `Categorised as ${CATS[t.category].name}`, `${t.merchant || 'Transaction'} ${a} was auto-approved${t.khata ? ' and added to Khata' : ''}.`, t.id);
        else
          notify('verify', 'Please check a transaction', `${t.merchant || 'A transaction'} ${a}: SnapTracker is ${t.confidence}% sure.`, t.id);
      }
      if (D.settings.push)
        S.ui.devNotes.unshift({ icon: '⚡', app: 'SnapTracker', text: t.status === 'duplicate' ? `Duplicate ignored: ${a}` : `${a} · ${t.description}` });
    }
    S.ui.devNotes.unshift({ icon: '💬', app: 'Messages · ' + sender, text: body.length > 90 ? body.slice(0, 90) + '…' : body });
    S.ui.devNotes = S.ui.devNotes.slice(0, 6);
    D.lastSync = Date.now();
    saveData();
    render();
  }, 650);
}

// #endregion

// #region Actions

function notify(type, title, body, txnId) {
  const D = S.data;
  if (!D.settings.notify[type])
    return;
  D.notes.unshift({ id: D.noteSeq++, type, title, body, at: Date.now(), read: false, txnId: txnId ?? null });
  D.notes = D.notes.slice(0, 60);
  toast(NOTE_TYPES[type].icon, title, body);
}

function toast(icon, title, body) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="t-ic">${icon}</span><span><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}</span>`;
  box.appendChild(el);
  while (box.children.length > 3)
    box.firstChild.remove();
  setTimeout(() => el.remove(), 4200);
}

function setStatus(t, status) {
  const D = S.data;
  t.status = status;
  if (['confirmed', 'auto'].includes(status) && D.settings.khata.autoPost)
    postKhata(D, t);
  if (['ignored', 'duplicate'].includes(status))
    t.khata = null;
}

function applyTheme() {
  // dashboard: light / dark / system is the shared preference; the account setting mirrors it.
  const th = PREFS.get().mode;
  if (S.data)
    S.data.settings.theme = th;
  if (th === 'system')
    document.documentElement.removeAttribute('data-theme');
  else
    document.documentElement.setAttribute('data-theme', th);
  store.set('theme', th);
}

function lock(reason) {
  if (!account().pw || S.locked)
    return;
  S.locked = true;
  S.ui.drawer = null;
  S.ui.modal = null;
  S.ui.device = false;
  S.ui.lockErr = '';
  audit(S.user, reason === 'idle' ? 'Locked after inactivity' : 'Locked');
  if (S.route.path.startsWith('/app'))
    S.next = S.route.path + (location.hash.includes('?') ? '?' + location.hash.split('?')[1] : '');
  go('/lock', true);
}

function unlocked(how) {
  S.locked = false;
  S.lockFails = 0;
  S.ui.lockErr = '';
  S.ui.modal = null;
  S.lastActive = Date.now();
  audit(S.user, 'Unlocked', how);
  const n = S.next || '/app';
  S.next = null;
  go(n, true);
}

function logout() {
  audit(S.user, 'Signed out');
  store.del('session');
  S.user = null;
  S.data = null;
  S.locked = false;
  S.ui = { ...S.ui, drawer: null, modal: null, device: false, devResult: null, devNotes: [], notes: false };
  S.login = { mode: 'email', email: '', cc: '+91', phone: '', error: '', busy: false };
  go('/login', true);
}

function seedHistory() {
  const D = S.data;
  let a = 20261031;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = (x, y) => Math.round(x + rnd() * (y - x));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  let refN = 430100000000;
  const ref = () => String((refN += r(1000, 90000)));
  const today = startOfDay(Date.now());
  const saved = { approval: D.settings.approval, notify: D.settings.notify };
  const msgs = [];
  for (let i = 185; i >= 0; i--) {
    const day = today - i * DAY;
    const dt = new Date(day), dom = dt.getDate();
    const at = (h, m) => day + h * HOUR + m * MIN;
    const add = (sms, when) => when <= Date.now() && msgs.push({ sender: sms[0], body: sms[1], receivedAt: when });
    if (dom === 1)
      add(TPL.salary(85000, dt), at(10, r(0, 59)));
    if (dom === 5 && day + 11 * HOUR <= Date.now())
      msgs.push({ manual: { type: 'debit', amount: 18000, merchant: 'Mr. Verma (landlord)', category: 'rent', method: 'Bank account', description: 'Monthly house rent paid to the landlord.', at: at(11, 0) } });
    if (dom === 9)
      add(TPL.bill(r(900, 1900), 'BESCOM Electricity bill', dt, ref()), at(19, r(0, 59)));
    if (dom === 14)
      add(TPL.bill(pick([299, 349, 599]), 'Airtel Prepaid recharge', dt, ref()), at(9, r(0, 59)));
    if (dom === 20)
      add(TPL.card(649, 'NETFLIX.COM', dt), at(6, r(0, 59)));
    if (rnd() < 0.38) {
      const amt = r(180, 780), m = pick(['zomato@hdfcbank', 'swiggy@icici', 'dominos@ybl']), rf = ref(), when = at(r(12, 22), r(0, 59));
      add(TPL.upiDebit(amt, m, dt, rf), when);
      if (rnd() < 0.12)
        add(TPL.phonepe(amt, m.split('@')[0], rf), when + MIN);
    }
    if (rnd() < 0.14)
      add(TPL.upiDebit(r(250, 1600), pick(['blinkit@axisbank', 'zepto@ybl', 'bigbasket@hdfcbank']), dt, ref()), at(r(8, 21), r(0, 59)));
    if (rnd() < 0.16)
      add(TPL.card(r(120, 520), pick(['UBER INDIA', 'OLA CABS', 'RAPIDO']), dt), at(r(8, 22), r(0, 59)));
    if (rnd() < 0.07)
      add(TPL.card(r(499, 4999), pick(['AMAZON', 'FLIPKART', 'MYNTRA']), dt), at(r(10, 23), r(0, 59)));
    if (rnd() < 0.05)
      add(TPL.card(r(800, 2000), 'INDIAN OIL PETROL', dt), at(r(8, 20), r(0, 59)));
    if (rnd() < 0.04)
      add(TPL.upiCredit(r(5, 50) * 100, pick(['RAHUL SHARMA', 'PRIYA NAIR', 'AMIT KUMAR']), dt, ref()), at(r(9, 22), r(0, 59)));
    if (rnd() < 0.03)
      add(TPL.atm(pick([2000, 3000, 5000]), dt), at(r(9, 21), r(0, 59)));
    if (rnd() < 0.03)
      add(TPL.card(r(150, 1200), 'APOLLO PHARMACY', dt), at(r(9, 21), r(0, 59)));
    if (rnd() < 0.02)
      add(TPL.refund(r(299, 1499), 'AMAZON', dt, ref()), at(r(9, 21), r(0, 59)));
    if (rnd() < 0.03)
      add(TPL.p2m(r(80, 900), pick(['GUPTA GENERAL', 'SHREE BALAJI STORES', 'NEW FRESH MART']), dt, ref()), at(r(8, 21), r(0, 59)));
  }
  const n1 = Date.now() - 26 * HOUR, n2 = Date.now() - 3 * HOUR;
  msgs.push({ sender: TPL.p2m(860, 'SHREE BALAJI STORES', new Date(n1), ref())[0], body: TPL.p2m(860, 'SHREE BALAJI STORES', new Date(n1), ref())[1], receivedAt: n1 });
  msgs.push({ sender: 'VM-KOTAKB-S', body: `INR 3,500.00 credited to your Kotak A/c XX5521 on ${dmy(new Date(n2))} via IMPS. Ref 6${ref()}.`, receivedAt: n2 });
  msgs.sort((x, y) => (x.receivedAt || x.manual.at) - (y.receivedAt || y.manual.at));
  msgs.forEach((m) => {
    if (m.manual) {
      D.txns.push({ id: D.seq++, source: 'manual', ...m.manual, kind: null, account: null, ref: null, confidence: 100, status: 'confirmed', note: '', edited: false, khata: null, dupOf: null, sms: null, createdAt: m.manual.at });
      postKhata(D, D.txns[D.txns.length - 1]);
      return;
    }
    const res = processSms(D, m, { now: m.receivedAt });
    if (res.txn) {
      res.txn.createdAt = m.receivedAt;
      if (res.txn.status === 'pending' && Date.now() - m.receivedAt > 3 * DAY)
        setStatus(res.txn, 'confirmed');
    }
  });
  D.filtered = { otp: D.filtered.otp + 37, promo: D.filtered.promo + 182, other: D.filtered.other + 64, failed: D.filtered.failed + 3 };
  D.settings.approval = saved.approval;
  D.sampleLoaded = true;
  saveData();
  toast('📚', 'Sample history loaded', `${D.txns.length} transactions from the last 6 months.`);
}

function closeOverlays() {
  S.ui.drawer = null;
  S.ui.modal = null;
}

const A = {
  loginMode(el) {
    S.login.mode = el.dataset.m;
    S.login.error = '';
    render();
    document.getElementById(S.login.mode === 'email' ? 'l-email' : 'l-phone')?.focus();
  },
  fillOtp() {
    const c = S.otp.devCode;
    [...c].forEach((d, i) => (document.getElementById('otp' + i).value = d));
    SUBMIT.verifyOtp();
  },
  async resendOtp() {
    const o = S.otp;
    if (Date.now() < o.resendAt)
      return;
    const err = await sendOtp(o.identifier, o.channel, o.purpose);
    if (err) {
      o.error = err;
      return render();
    }
    toast('✉️', 'New code sent', maskId(S.otp.identifier, S.otp.channel));
    render();
  },
  changeId() {
    const reset = S.otp?.purpose === 'reset';
    S.otp = null;
    go(reset ? '/lock' : '/login', true);
  },
  peek(el) {
    const input = document.getElementById(el.dataset.for);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', String(show));
    el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    el.innerHTML = ic(show ? 'eyeOff' : 'eye');
  },
  skipPassword() {
    saveAccount({ skipped: true });
    audit(S.user, 'Skipped app password');
    go('/app', true);
  },
  cancelPassword() {
    S.resetOk = false;
    go(account().pw && S.locked ? '/lock' : '/app/settings', true);
  },
  async forgotPw() {
    const acc = account();
    const err = await sendOtp(S.user, acc.channel, 'reset');
    if (err) {
      S.ui.lockErr = err;
      return render();
    }
    go('/otp', true);
  },
  biometric() {
    S.ui.modal = { kind: 'biometric' };
    render();
    setTimeout(() => {
      if (S.ui.modal?.kind !== 'biometric')
        return;
      S.ui.modal.done = true;
      render();
      setTimeout(() => unlocked('Biometric'), 500);
    }, 1300);
  },
  logout,
  lockNow: () => lock('manual'),
  theme() {
    const order = ['system', 'light', 'dark'];
    const s = S.data.settings;
    s.theme = order[(order.indexOf(s.theme) + 1) % 3];
    PREFS.set({ mode: s.theme });
    saveData();
    applyTheme();
    render();
  },
  setTheme(el) {
    S.data.settings.theme = el.dataset.t;
    PREFS.set({ mode: el.dataset.t });
    saveData();
    applyTheme();
    render();
  },
  toggleNotes() {
    S.ui.notes = !S.ui.notes;
    render();
  },
  readAll() {
    S.data.notes.forEach((n) => (n.read = true));
    saveData();
    render();
  },
  openNote(el) {
    const n = S.data.notes.find((x) => x.id === +el.dataset.id);
    n.read = true;
    saveData();
    S.ui.notes = false;
    if (n.txnId && S.data.txns.some((t) => t.id === n.txnId))
      S.ui.drawer = n.txnId;
    render();
  },
  openDevice() {
    S.ui.device = true;
    S.ui.drawer = null;
    render();
  },
  closeDevice() {
    S.ui.device = false;
    render();
  },
  deliver(el) {
    const s = sampleMessages(S.ui.ref)[+el.dataset.i];
    deliver(s.sms[0], s.sms[1]);
  },
  seed() {
    if (S.data.sampleLoaded)
      return;
    seedHistory();
    S.ui.filter = 'all';
    if (S.route.path === '/app/transactions')
      return go('/app/transactions?f=all', true);
    render();
  },
  sync() {
    S.ui.syncing = true;
    render();
    setTimeout(() => {
      S.ui.syncing = false;
      S.data.lastSync = Date.now();
      notify('sync', 'Synchronisation completed', 'The phone had no queued messages. Everything is up to date.');
      saveData();
      render();
    }, 1400);
  },
  enableTracking() {
    S.ui.device = false;
    S.ui.modal = { kind: 'disclosure' };
    render();
  },
  consentNext() {
    if (!document.getElementById('consent').checked) {
      toast('☑️', 'Please tick the box to continue', 'Tracking only starts with your consent.');
      return;
    }
    S.data.tracking.consent = true;
    audit(S.user, 'Accepted SMS disclosure');
    S.ui.modal = { kind: 'android' };
    render();
  },
  permAllow() {
    const D = S.data;
    S.ui.modal = null;
    D.tracking.state = 'enabled';
    D.tracking.since = Date.now();
    audit(S.user, 'SMS tracking turned on', 'Android RECEIVE_SMS granted');
    S.ui.syncing = true;
    saveData();
    render();
    setTimeout(() => {
      S.ui.syncing = false;
      notify('sync', 'Tracking is on', 'New bank and UPI alerts will appear here automatically.');
      saveData();
      render();
    }, 1200);
  },
  permDeny() {
    S.ui.modal = null;
    audit(S.user, 'SMS permission denied');
    toast('⛔', 'Permission not granted', 'SnapTracker cannot detect transactions without it. You can still add them manually.');
    render();
  },
  pause() {
    S.data.tracking.state = 'paused';
    audit(S.user, 'SMS tracking paused');
    notify('paused', 'Tracking paused', 'New SMS will not be read until you resume.');
    saveData();
    render();
  },
  resume() {
    const D = S.data;
    D.tracking.state = 'enabled';
    D.tracking.since = Date.now();
    audit(S.user, 'SMS tracking resumed');
    notify('paused', 'Tracking resumed', 'SnapTracker is reading bank alerts again.');
    saveData();
    render();
  },
  askRevoke() {
    S.ui.modal = { kind: 'confirm', title: 'Revoke SMS access?', body: 'SnapTracker stops reading SMS and the Android permission is removed. Your existing transactions stay.', ok: 'Revoke access', danger: true, act: 'revoke' };
    render();
  },
  revoke() {
    const D = S.data;
    D.tracking = { state: 'permission', consent: false, since: null };
    S.ui.modal = null;
    audit(S.user, 'SMS access revoked');
    notify('revoked', 'Tracking permission revoked', 'SnapTracker no longer reads SMS on this phone.');
    saveData();
    render();
  },
  exportData() {
    const blob = new Blob([JSON.stringify({ account: S.user, exportedAt: new Date().toISOString(), transactions: S.data.txns, settings: S.data.settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'snaptracker-data.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    audit(S.user, 'Data exported');
  },
  askDeleteTexts() {
    S.ui.modal = { kind: 'confirm', title: 'Delete original SMS texts?', body: 'Every stored SMS text is erased. Transactions, amounts and categories stay. This cannot be undone.', ok: 'Delete texts', danger: true, act: 'deleteTexts' };
    render();
  },
  deleteTexts() {
    S.data.txns.forEach((t) => (t.sms = null));
    S.ui.modal = null;
    audit(S.user, 'Original SMS texts deleted');
    saveData();
    toast('🗑️', 'SMS texts deleted', 'Transactions were kept.');
    render();
  },
  askDeleteAll() {
    S.ui.modal = { kind: 'confirm', title: 'Delete all SnapTracker data?', body: 'All detected transactions, SMS texts, notifications and their Khata entries are deleted, and tracking is turned off. Your SnapKhata books stay. This cannot be undone.', ok: 'Delete everything', danger: true, act: 'deleteAll' };
    render();
  },
  deleteAll() {
    const keep = S.data.settings;
    S.data = newData();
    S.data.settings = keep;
    S.data.sampleLoaded = true;
    S.ui.modal = null;
    S.ui.devResult = null;
    S.ui.devNotes = [];
    audit(S.user, 'All SnapTracker data deleted');
    saveData();
    toast('🗑️', 'All SnapTracker data deleted', '');
    go('/app', true);
    render();
  },
  askReset() {
    S.ui.modal = { kind: 'confirm', title: 'Reset the prototype?', body: 'Clears every account, password, transaction and setting saved by this prototype in this browser.', ok: 'Reset', danger: true, act: 'reset' };
    render();
  },
  reset() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('snaptracker:')).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    location.hash = '#/login';
    location.reload();
  },
  filter(el) {
    S.ui.filter = el.dataset.f;
    go('/app/transactions?f=' + el.dataset.f, true);
  },
  openTx(el) {
    S.ui.drawer = +el.dataset.id;
    S.ui.device = false;
    S.ui.notes = false;
    render();
    document.querySelector('.drawer .btn.icon')?.focus();
  },
  closeDrawer() {
    S.ui.drawer = null;
    render();
  },
  closeModal() {
    S.ui.modal = null;
    render();
  },
  confirm(el) {
    const t = S.data.txns.find((x) => x.id === +el.dataset.id);
    setStatus(t, 'confirmed');
    audit(S.user, 'Transaction confirmed', `${t.merchant || ''} ${money(t.amount)}`);
    saveData();
    toast('✅', 'Confirmed', t.khata ? `Added to Khata · ${t.khata.book} (${t.khata.no})` : t.description);
    render();
  },
  ignore(el) {
    const t = S.data.txns.find((x) => x.id === +el.dataset.id);
    t.prevStatus = t.status;
    setStatus(t, 'ignored');
    saveData();
    toast('🙈', 'Ignored', 'Not counted in totals. You can restore it from the Ignored filter.');
    render();
  },
  restore(el) {
    const t = S.data.txns.find((x) => x.id === +el.dataset.id);
    setStatus(t, t.prevStatus && t.prevStatus !== 'ignored' ? t.prevStatus : 'pending');
    saveData();
    render();
  },
  notDup(el) {
    const t = S.data.txns.find((x) => x.id === +el.dataset.id);
    t.dupOf = null;
    t.dupWhy = null;
    setStatus(t, 'pending');
    saveData();
    render();
  },
  askDelete(el) {
    S.ui.modal = { kind: 'confirm', title: 'Delete this transaction?', body: 'It is removed from SnapTracker and from your Khata book, together with its SMS text.', ok: 'Delete', danger: true, act: 'doDelete', id: +el.dataset.id };
    render();
  },
  doDelete(el) {
    const id = +el.dataset.id;
    S.data.txns = S.data.txns.filter((t) => t.id !== id);
    S.ui.modal = null;
    S.ui.drawer = null;
    audit(S.user, 'Transaction deleted');
    saveData();
    toast('🗑️', 'Transaction deleted', '');
    render();
  },
  pickCat(el) {
    S.ui.modal = { kind: 'category', id: +el.dataset.id };
    render();
  },
  setCat(el) {
    const D = S.data, t = D.txns.find((x) => x.id === +el.dataset.id);
    t.category = el.dataset.c;
    if (!t.edited)
      t.description = describe(t);
    if (t.merchant && document.getElementById('cat-rule')?.checked)
      D.rules[t.merchant.toLowerCase()] = t.category;
    S.ui.modal = null;
    saveData();
    toast('🏷️', `Category: ${CATS[t.category].name}`, t.merchant && D.rules[t.merchant.toLowerCase()] ? `Future ${t.merchant} payments will use it too.` : '');
    render();
  },
  edit(el) {
    S.ui.modal = { kind: 'edit', id: +el.dataset.id };
    render();
  },
  addManual() {
    S.ui.modal = { kind: 'edit', id: null };
    render();
    document.getElementById('e-amt')?.focus();
  },
  editType(el) {
    document.getElementById('e-type').value = el.dataset.t;
    el.parentElement.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-selected', String(b === el));
      b.setAttribute('aria-checked', String(b === el));
    });
  },
};

const SUBMIT = {
  async sendOtp(form) {
    const L = S.login;
    let id, err = '';
    if (L.mode === 'email') {
      L.email = form.email.value.trim();
      id = L.email.toLowerCase();
      if (!id)
        err = 'Enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id))
        err = 'That email address does not look right.';
    } else {
      L.cc = form.cc.value;
      L.phone = form.phone.value.replace(/\D/g, '');
      const c = COUNTRIES.find((x) => x.code === L.cc);
      id = L.cc + L.phone;
      if (!L.phone)
        err = 'Enter your mobile number.';
      else if (L.phone.length !== c.len)
        err = `${c.name} numbers have ${c.len} digits.`;
      else if (!c.re.test(L.phone))
        err = 'That mobile number does not look right.';
    }
    L.error = err;
    if (err)
      return render();
    L.busy = true;
    render();
    await new Promise((r) => setTimeout(r, 700));
    const e2 = await sendOtp(id, L.mode, 'login');
    L.busy = false;
    if (e2) {
      L.error = e2;
      return render();
    }
    go('/otp');
  },
  verifyOtp() {
    const code = [0, 1, 2, 3, 4, 5].map((i) => document.getElementById('otp' + i)?.value || '').join('');
    verifyOtp(code);
  },
  async setPassword(form) {
    const mode = form.dataset.mode, err = document.getElementById('pw-err');
    const pw = form.pw.value, conf = form.conf.value;
    const acc = account();
    if (mode === 'change') {
      if ((await pbkdf2(form.cur.value, acc.pw.salt)) !== acc.pw.hash) {
        err.textContent = 'Current password is not right.';
        return;
      }
    }
    const r = pwRules(pw);
    if (!r.ok) {
      err.textContent = r.common ? 'This password is too common. Choose something less guessable.' : 'The password does not meet all the rules above.';
      return;
    }
    if (pw !== conf) {
      err.textContent = 'The two passwords do not match.';
      return;
    }
    const btn = document.getElementById('pw-save');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Saving securely…';
    const salt = randHex(16);
    saveAccount({ pw: { salt, hash: await pbkdf2(pw, salt), algo: 'PBKDF2-SHA256 (prototype)', at: Date.now() }, skipped: false });
    audit(S.user, mode === 'reset' ? 'App password reset with one-time code' : mode === 'change' ? 'App password changed' : 'App password created');
    S.resetOk = false;
    S.locked = false;
    S.lockFails = 0;
    toast('🔒', mode === 'setup' ? 'App password created' : 'App password updated', 'SnapTracker will ask for it when you come back.');
    go(mode === 'change' ? '/app/settings' : S.next || '/app', true);
    S.next = null;
  },
  async unlock(form) {
    const acc = account();
    const pw = form.pw.value;
    if (!pw) {
      S.ui.lockErr = 'Enter your app password.';
      return render();
    }
    if ((await pbkdf2(pw, acc.pw.salt)) === acc.pw.hash)
      return unlocked('App password');
    S.lockFails++;
    audit(S.user, 'Wrong app password', `${S.lockFails} of 5`);
    S.ui.lockErr = S.lockFails >= 5 ? 'Too many wrong tries. Use "Forgot app password?" to verify with a one-time code.' : `Wrong password. ${5 - S.lockFails} ${5 - S.lockFails === 1 ? 'try' : 'tries'} left.`;
    render();
  },
  saveTxn(form, ev) {
    const D = S.data, id = form.dataset.id ? +form.dataset.id : null;
    const amount = Math.round(parseFloat(form.amount.value) * 100) / 100;
    const at = new Date(form.at.value).getTime();
    const errEl = document.getElementById('e-err');
    if (!(amount > 0)) {
      errEl.textContent = 'Enter an amount greater than zero.';
      return;
    }
    if (!at || at > Date.now() + 5 * MIN) {
      errEl.textContent = 'Choose a date and time that is not in the future.';
      return;
    }
    const v = { type: form.type.value, amount, at, merchant: form.merchant.value.trim() || null, category: form.category.value, method: form.method.value, note: form.note.value.trim() };
    const desc = form.description.value.trim();
    const confirmNow = ev.submitter && ev.submitter.value === '1';
    let t;
    if (id) {
      t = D.txns.find((x) => x.id === id);
      const changed = t.description !== desc;
      Object.assign(t, v);
      t.edited = true;
      t.description = desc && changed ? desc : desc || describe(t);
      if (confirmNow)
        setStatus(t, 'confirmed');
    } else {
      t = { id: D.seq++, source: 'manual', ...v, kind: null, account: null, ref: null, confidence: 100, status: 'confirmed', edited: false, khata: null, dupOf: null, sms: null, createdAt: Date.now() };
      t.description = desc || describe(t);
      const dup = findDuplicate(t, D);
      D.txns.push(t);
      if (dup)
        toast('🧬', 'Possible duplicate', `${dup.why} Check before keeping both.`);
      setStatus(t, 'confirmed');
    }
    if (t.khata && form.book.value !== t.khata.book)
      t.khata.book = form.book.value;
    else if (!t.khata && ['confirmed', 'auto'].includes(t.status) && D.settings.khata.autoPost) {
      const keep = D.settings.khata.book;
      D.settings.khata.book = form.book.value;
      postKhata(D, t);
      D.settings.khata.book = keep;
    }
    S.ui.modal = null;
    saveData();
    toast('💾', id ? 'Saved' : 'Transaction added', t.description);
    render();
  },
  deliverCustom(form) {
    deliver(form.sender.value.trim(), form.body.value);
  },
};

const CHANGE = {
  trackSwitch(el) {
    el.checked ? A.enableTracking() : A.pause();
  },
  approval(el) {
    S.data.settings.approval = el.value;
    saveData();
    render();
  },
  threshold(el) {
    S.data.settings.threshold = +el.value;
    saveData();
  },
  khataAuto(el) {
    S.data.settings.khata.autoPost = el.checked;
    saveData();
  },
  khataBook(el) {
    S.data.settings.khata.book = el.value;
    saveData();
    render();
  },
  autoLock(el) {
    S.data.settings.autoLock = +el.value;
    saveData();
  },
  biometric(el) {
    S.data.settings.biometric = el.checked;
    audit(S.user, el.checked ? 'Biometric unlock turned on' : 'Biometric unlock turned off');
    saveData();
  },
  pushPref(el) {
    S.data.settings.push = el.checked;
    saveData();
  },
  notePref(el) {
    S.data.settings.notify[el.dataset.k] = el.checked;
    saveData();
  },
};

// #endregion

// #region Boot

function boot() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (el && !el.disabled && A[el.dataset.act]) {
      ev.preventDefault();
      A[el.dataset.act](el, ev);
      return;
    }
    if (S.ui.notes && !ev.target.closest('.pop')) {
      S.ui.notes = false;
      render();
    }
  });
  document.addEventListener('submit', (ev) => {
    const fn = SUBMIT[ev.target.dataset.submit];
    if (fn) {
      ev.preventDefault();
      fn(ev.target, ev);
    }
  });
  document.addEventListener('change', (ev) => {
    const fn = CHANGE[ev.target.dataset.change];
    if (fn)
      fn(ev.target);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.id === 'thr')
      document.getElementById('thr-v').textContent = el.value;
    if (el.id === 'tx-search') {
      S.ui.search = el.value;
      render();
    }
    if (el.id === 'l-email')
      S.login.email = el.value;
    if (el.id === 'l-phone')
      S.login.phone = el.value;
    if (el.id === 'pw-new')
      paintStrength(el.value);
    if (el.classList.contains('otp-box')) {
      const i = +el.id.slice(3);
      const digits = el.value.replace(/\D/g, '');
      if (digits.length > 1) {
        spreadOtp(digits, i);
        return;
      }
      el.value = digits;
      document.getElementById('otp').classList.remove('bad', 'shake');
      if (digits && i < 5)
        document.getElementById('otp' + (i + 1)).focus();
      if (digits && i === 5)
        SUBMIT.verifyOtp();
    }
  });
  document.addEventListener('keydown', (ev) => {
    const el = ev.target;
    if (el.classList?.contains('otp-box')) {
      const i = +el.id.slice(3);
      if (ev.key === 'Backspace' && !el.value && i > 0) {
        const prev = document.getElementById('otp' + (i - 1));
        prev.value = '';
        prev.focus();
        ev.preventDefault();
      } else if (ev.key === 'ArrowLeft' && i > 0)
        document.getElementById('otp' + (i - 1)).focus();
      else if (ev.key === 'ArrowRight' && i < 5)
        document.getElementById('otp' + (i + 1)).focus();
    }
    if (ev.key === 'Enter' && el.matches?.('[role=button][data-act]'))
      el.click();
    if (ev.key === 'Escape') {
      if (S.ui.modal)
        A.closeModal();
      else if (S.ui.drawer != null)
        A.closeDrawer();
      else if (S.ui.device)
        A.closeDevice();
      else if (S.ui.notes)
        A.toggleNotes();
    }
  });
  document.addEventListener('paste', (ev) => {
    const el = ev.target;
    if (!el.classList?.contains('otp-box'))
      return;
    const digits = (ev.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!digits)
      return;
    ev.preventDefault();
    spreadOtp(digits, +el.id.slice(3));
  });
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((e) => document.addEventListener(e, () => (S.lastActive = Date.now()), { passive: true }));
  setInterval(tick, 1000);
  window.addEventListener('hashchange', route);
  // dashboard: the sidebar asks for another SnapTracker screen; the theme changed in the dashboard or another page.
  BRIDGE.on('goto', (d) => go(d.path));
  PREFS.onChange(() => {
    applyTheme();
    if (S.data)
      render();
  });
  const sess = store.get('session');
  if (sess && sess.exp > Date.now() && accounts()[sess.user]) {
    loadUser(sess.user);
    S.locked = !!account().pw;
  } else
    applyTheme();
  route();
}

function spreadOtp(digits, from) {
  const start = digits.length >= 6 ? 0 : from;
  [...digits.slice(0, 6 - start)].forEach((d, k) => (document.getElementById('otp' + (start + k)).value = d));
  const last = Math.min(5, start + digits.length);
  document.getElementById('otp' + last).focus();
  if ([0, 1, 2, 3, 4, 5].every((i) => document.getElementById('otp' + i).value))
    SUBMIT.verifyOtp();
}

function paintStrength(p) {
  const r = pwRules(p);
  const [label, color] = STRENGTH[r.score];
  document.querySelectorAll('#pw-meter i').forEach((el, i) => (el.style.background = i < r.score ? color : 'var(--line)'));
  document.getElementById('pw-strength').textContent = 'Password strength: ' + (label || '–') + (r.common ? ' (too common)' : '');
  document.querySelectorAll('#pw-rules li').forEach((li, i) => li.classList.toggle('on', r.rules[i][1]));
}

function tick() {
  if (S.otp && S.route.path === '/otp') {
    const ex = document.querySelector('[data-tick=expiry]');
    const left = S.otp.expiresAt - Date.now();
    if (ex)
      ex.textContent = left > 0 ? `Code expires in ${mmss(left)}` : 'This code has expired. Request a new one.';
    const rs = document.querySelector('[data-tick=resend]');
    if (rs) {
      const w = S.otp.resendAt - Date.now();
      rs.disabled = w > 0;
      rs.textContent = w > 0 ? `Resend code in ${mmss(w)}` : 'Resend code';
    }
    if (left <= 0 && !S.otp.expiredShown) {
      S.otp.expiredShown = true;
      S.otp.error = 'This code has expired. Request a new one.';
      render();
    }
  }
  if (S.user && !S.locked && S.data && account().pw && S.data.settings.autoLock && Date.now() - S.lastActive > S.data.settings.autoLock * MIN)
    lock('idle');
}

if (typeof document !== 'undefined' && typeof window !== 'undefined')
  boot();

// #endregion
