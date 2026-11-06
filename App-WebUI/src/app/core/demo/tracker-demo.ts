import { DemoFailure } from './demo-failure';
import { DemoDb, DemoUser } from './demo.model';
import { TRACKER_DEMO_MESSAGES } from './tracker-demo-messages';
import { TRACKER_ALERT_TYPES, TRACKER_CATEGORIES, TRACKER_METHODS, TRACKER_SENDERS } from '../tracker-meta';
import { TrackerDemoDb, TrackerDemoResult, TrackerDemoUser, TrackerMerchantFound, TrackerParsed } from './tracker-demo.model';
import { TrackerAlertType, TrackerApproval, TrackerData, TrackerImportResult, TrackerMethod, TrackerSmsResult, TrackerStep, TrackerTxn, TrackerTxnRequest } from '../models/tracker.model';

export { TRACKER_DEMO_MESSAGES };

const DAY = 864e5;
const MIN = 6e4;
const HOUR = 36e5;
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** The same values as Tracker in appsettings.json of the plan: the approval a new user starts with, the duplicate window and the limits. */
const RULES = { approval: 'smart' as TrackerApproval, threshold: 85, duplicateMinutes: 10, maxSms: 1000, maxImportBatch: 200, merchantLength: 60, noteLength: 300, maxAmount: 100000000 };
const SENDER_KIND: Record<string, string> = { T: 'transactional', S: 'service', P: 'promotional', G: 'government' };

/** Merchant dictionary: pattern, display name, category, sub-kind used by the description (the TrackerMerchants seed rows of the plan). */
const MERCHANTS: [RegExp, string, string, string?][] = [
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
const DATE_RES = [/\b(\d{1,2})[-/ ]?([A-Za-z]{3})[a-z]*[-/ ,]?(\d{2,4})\b/, /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/, /\b(\d{4})-(\d{2})-(\d{2})\b/];
const TIME_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i;
const STOP = String.raw`(?=\s+(?:on\b|via\b|using\b|ref|upi\b|is\b|has\b|from\b|with\b|avl|info\b|\()|\s*[.,(:;]|\s*$)`;
const mk = (w: string): RegExp => new RegExp(String.raw`\b(?:${w})\s+([A-Za-z0-9][A-Za-z0-9&'\-/ ]{1,45}?)` + STOP, 'gi');
const M_AT = mk('at');
const M_FOR = mk('for');
const M_TO = mk('to|towards');
const M_FROM = mk('from|by');
const VPA_RE = /(?:vpa|upi id|to|from|by)\s*[:-]?\s*([a-z0-9][a-z0-9._-]{1,40}@[a-z][a-z0-9]{1,20})/i;
const P2M_RE = /UPI\/P2[MA]\/\d+\/([A-Za-z0-9 &.'-]{2,40}?)(?=\s*[.,/]|\s+ref|\s*$)/i;
const BAD_M = /^(a\/c|ac\b|acct|account|your|you\b|the\b|card|upi\b|neft|imps|rtgs|xx|rs\b|rs\d|inr|date\b|txn|\d)/i;
const BAD_M2 = /\b(a\/c|acct|account|bank)\b/i;

const pad = (n: number): string => String(n).padStart(2, '0');
const titleCase = (s: string): string => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\s+/g, ' ').trim();
const iso = (ms: number): string => new Date(ms).toISOString();
const ms = (s: string): number => new Date(s).getTime();
const startOfDay = (t: number): number => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime();

/** SMS templates of the banks and payment apps, used by the sample history (the same wording as the prototype). */
const f2 = (n: number): string => n.toFixed(2);
const f2c = (n: number): string => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (d: Date): string => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`;
const dMon = (d: Date): string => `${pad(d.getDate())}${titleCase(MON[d.getMonth()])}${String(d.getFullYear()).slice(2)}`;
const dMonY = (d: Date): string => `${pad(d.getDate())}-${MON[d.getMonth()].toUpperCase()}-${String(d.getFullYear()).slice(2)}`;
const TPL = {
  upiDebit: (amt: number, vpa: string, d: Date, ref: string): [string, string] => ['AD-HDFCBK-S', `Sent Rs.${f2(amt)} from HDFC Bank A/C *4821 to ${vpa} on ${dmy(d)}. Ref ${ref}. Not You? Call 18002586161/SMS BLOCK UPI to 7308080808`],
  phonepe: (amt: number, name: string, ref: string): [string, string] => ['JM-PHONPE-S', `Paid Rs.${amt} to ${name} from HDFC Bank a/c XX4821 using PhonePe UPI. UPI Ref: ${ref}.`],
  card: (amt: number, m: string, d: Date): [string, string] => ['AX-ICICIB-S', `INR ${f2c(amt)} spent on ICICI Bank Credit Card XX9034 on ${dMonY(d)} at ${m}. Avl Lmt: INR 1,24,560.00. If not you, call 1800 2662/SMS BLOCK 9034 to 9215676766`],
  upiCredit: (amt: number, name: string, d: Date, ref: string): [string, string] => ['JD-SBIUPI-S', `Dear UPI user A/C X4821 credited by Rs${f2(amt)} on date ${dMon(d)} trf from ${name} Refno ${ref}. If not u? call 1800111109. -SBI`],
  bill: (amt: number, biller: string, d: Date, ref: string): [string, string] => ['JD-AXISBK-S', `Payment of INR ${f2c(amt)} for ${biller} from Axis Bank A/c XX7712 via UPI is successful on ${dmy(d)}. Ref no ${ref}.`],
  salary: (amt: number, d: Date): [string, string] => ['VK-HDFCBK-S', `INR ${f2c(amt)} credited to HDFC Bank A/c XX4821 on ${dmy(d)} by NEFT from ACME TECHNOLOGIES PVT LTD (Salary). Avl bal INR 1,02,340.55`],
  atm: (amt: number, d: Date): [string, string] => ['AD-SBIINB-S', `Rs.${amt} withdrawn at SBI ATM S1NW000123 from A/c X4821 on ${dmy(d)}. Avl Bal Rs.18,220.00`],
  refund: (amt: number, m: string, d: Date, ref: string): [string, string] => ['VM-HDFCBK-S', `Refund of Rs.${f2(amt)} from ${m} has been credited to your HDFC Bank A/c XX4821 on ${dmy(d)}. Ref ${ref}.`],
  p2m: (amt: number, shop: string, d: Date, ref: string): [string, string] => ['VM-AXISBK-S', `INR ${f2c(amt)} debited from A/c no. XX7712 on ${dmy(d)} for UPI/P2M/${ref}/${shop}. Not you? Call 18004195959`],
};

/**
 * SnapTracker's API (TrackerController of the plan) inside the browser, for the Angular-only Mojito demo. It reads an SMS the way the prototype does
 * (sender list, OTP and promotion filters, amount, direction, method, account, reference, date, merchant, category, confidence, duplicate check), keeps
 * every account's transactions in the demo database (DemoDb.tracker) and answers with message codes like the API. Loaded with the first SnapTracker call.
 */
export class TrackerDemo {
  private readonly me: TrackerDemoUser;

  constructor(db: DemoDb, user: DemoUser, private readonly save: () => void) {
    db.tracker ??= { users: {} } as TrackerDemoDb;
    db.tracker.users[user.id] ??= this.fresh();
    this.me = db.tracker.users[user.id];
  }

  // #region Public Methods

  route(method: string, path: string, body: unknown): TrackerDemoResult {
    const b = (body ?? {}) as Record<string, unknown>;
    const id = Number(/\/transactions\/(\d+)/.exec(path)?.[1] ?? 0);
    const key = `${method} ${path.replace(/\/\d+(?=\/|$)/g, '/{id}')}`;
    switch (key) {
      case 'GET /tracker/state':
        return { data: this.me.data };
      case 'POST /tracker/sms':
        return this.readSms(b);
      case 'POST /tracker/sms/import':
        return this.importSms(b);
      case 'POST /tracker/transactions':
        return this.addManual(b);
      case 'PUT /tracker/transactions/{id}':
        return this.edit(id, b);
      case 'POST /tracker/transactions/{id}/confirm':
        return this.setStatus(id, 'confirmed', 'TRACKER_CONFIRMED');
      case 'POST /tracker/transactions/{id}/ignore':
        return this.setStatus(id, 'ignored', 'TRACKER_IGNORED');
      case 'POST /tracker/transactions/{id}/restore':
        return this.setStatus(id, 'confirmed', 'TRACKER_RESTORED');
      case 'POST /tracker/transactions/{id}/not-duplicate':
        return this.notDuplicate(id);
      case 'PUT /tracker/transactions/{id}/category':
        return this.setCategory(id, b);
      case 'DELETE /tracker/transactions/{id}':
        return this.remove(id);
      case 'POST /tracker/tracking/enable':
      case 'POST /tracker/tracking/pause':
      case 'POST /tracker/tracking/resume':
      case 'POST /tracker/tracking/revoke':
        return this.tracking(path.slice(path.lastIndexOf('/') + 1));
      case 'GET /tracker/settings':
        return { data: this.me.data.settings };
      case 'PUT /tracker/settings':
        return this.saveSettings(b);
      case 'POST /tracker/alerts/read':
        this.me.data.alerts.forEach((a) => (a.read = true));
        return this.done('TRACKER_ALERTS_READ');
      case 'POST /tracker/demo/sample':
        return this.sample();
      case 'GET /tracker/export':
        return { data: { exportedOn: iso(Date.now()), ...this.me.data } };
      case 'DELETE /tracker/sms-texts':
        this.me.data.txns.forEach((t) => (t.sms = null));
        return this.done('TRACKER_SMS_TEXTS_DELETED');
      case 'DELETE /tracker/me':
        Object.assign(this.me, this.fresh());
        return this.done('TRACKER_DATA_DELETED');
      default:
        throw new DemoFailure(404, 'UNEXPECTED_ERROR');
    }
  }

  // #endregion

  // #region Private Methods

  private fresh(): TrackerDemoUser {
    const alerts = Object.fromEntries(TRACKER_ALERT_TYPES.map((k) => [k, true])) as Record<TrackerAlertType, boolean>;
    const data: TrackerData = { txns: [], alerts: [], sampleLoaded: false, tracking: { state: 'permission', since: null }, filtered: { otp: 0, promo: 0, other: 0, failed: 0 }, settings: { approval: RULES.approval, threshold: RULES.threshold, push: true, alerts } };
    return { seq: 1, alertSeq: 1, rules: {}, data };
  }

  /** Demo only: about six months of typical bank and UPI SMS, read by the same pipeline (the prototype's sample history). */
  private sample(): TrackerDemoResult {
    const D = this.me.data;
    let a = 20261031;
    const rnd = (): number => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = (x: number, y: number): number => Math.round(x + rnd() * (y - x));
    const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
    let refN = 430100000000;
    const ref = (): string => String((refN += r(1000, 90000)));
    const now = Date.now();
    const today = startOfDay(now);
    const before = D.txns.length;
    const saved = { approval: D.settings.approval, alerts: { ...D.settings.alerts } };
    TRACKER_ALERT_TYPES.forEach((k) => (D.settings.alerts[k] = false));
    const msgs: { sms?: [string, string]; at: number; rent?: boolean }[] = [];
    for (let i = 185; i >= 0; i--) {
      const day = today - i * DAY;
      const dt = new Date(day);
      const dom = dt.getDate();
      const at = (h: number, m: number): number => day + h * HOUR + m * MIN;
      const add = (sms: [string, string], when: number) => when <= now && msgs.push({ sms, at: when });
      if (dom === 1)
        add(TPL.salary(85000, dt), at(10, r(0, 59)));
      if (dom === 5 && at(11, 0) <= now)
        msgs.push({ rent: true, at: at(11, 0) });
      if (dom === 9)
        add(TPL.bill(r(900, 1900), 'BESCOM Electricity bill', dt, ref()), at(19, r(0, 59)));
      if (dom === 14)
        add(TPL.bill(pick([299, 349, 599]), 'Airtel Prepaid recharge', dt, ref()), at(9, r(0, 59)));
      if (dom === 20)
        add(TPL.card(649, 'NETFLIX.COM', dt), at(6, r(0, 59)));
      if (rnd() < 0.38) {
        const amt = r(180, 780);
        const m = pick(['zomato@hdfcbank', 'swiggy@icici', 'dominos@ybl']);
        const rf = ref();
        const when = at(r(12, 22), r(0, 59));
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
    const n1 = now - 26 * HOUR;
    msgs.push({ sms: TPL.p2m(860, 'SHREE BALAJI STORES', new Date(n1), ref()), at: n1 });
    msgs.push({ sms: ['VM-KOTAKB-S', `INR 3,500.00 credited to your Kotak A/c XX5521 on ${dmy(new Date(now - 3 * HOUR))} via IMPS. Ref 6${ref()}.`], at: now - 3 * HOUR });
    msgs.sort((x, y) => x.at - y.at);
    for (const m of msgs) {
      if (m.rent) {
        D.txns.push({ id: this.me.seq++, source: 'manual', type: 'debit', amount: 18000, merchant: 'Mr. Verma (landlord)', category: 'rent', method: 'bank', at: iso(m.at), createdAt: iso(m.at), kind: null, account: null, ref: null, confidence: 100, status: 'confirmed', note: '', edited: false, typeGuessed: false, dupOf: null, dupWhy: null, sms: null });
        continue;
      }
      const res = this.process(m.sms![0], m.sms![1], m.at);
      if (res.txn && res.txn.status === 'pending' && now - m.at > 3 * DAY)
        res.txn.status = 'confirmed';
    }
    D.filtered = { otp: D.filtered.otp + 37, promo: D.filtered.promo + 182, other: D.filtered.other + 64, failed: D.filtered.failed + 3 };
    D.settings.approval = saved.approval;
    D.settings.alerts = saved.alerts;
    D.sampleLoaded = true;
    if (D.tracking.state === 'permission')
      Object.assign(D.tracking, { state: 'enabled', since: iso(today - 185 * DAY) });
    return this.done('TRACKER_DEMO_SAMPLE_LOADED', [D.txns.length - before]);
  }

  private txn(id: number): TrackerTxn {
    const t = this.me.data.txns.find((x) => x.id === id);
    if (!t)
      throw new DemoFailure(404, 'TRACKER_NOT_FOUND');
    return t;
  }

  private method(b: string): TrackerMethod {
    if (/\batm\b/i.test(b) && /withdra/i.test(b))
      return 'atm';
    if (/\b(upi|vpa)\b|@[a-z]{2,}/i.test(b))
      return 'upi';
    if (/credit card/i.test(b))
      return 'creditCard';
    if (/debit card/i.test(b))
      return 'debitCard';
    if (/\bcard\b/i.test(b))
      return 'card';
    if (/\b(neft|imps|rtgs)\b/i.test(b))
      return /\bneft\b/i.test(b) ? 'neft' : /\bimps\b/i.test(b) ? 'imps' : 'rtgs';
    return /net ?banking/i.test(b) ? 'netBanking' : 'bank';
  }

  /** A pasted SMS often comes without its sender: the bank named in the text stands in for it (AD-HDFCBK-S for "HDFC Bank"). */
  private guessSender(body: string): string {
    const hit = Object.entries(TRACKER_SENDERS).find(([, name]) => body.toLowerCase().includes(name.toLowerCase().replace(/ bank$/, '')));
    return hit ? `AD-${hit[0]}-S` : '';
  }

  private remove(id: number): TrackerDemoResult {
    const t = this.txn(id);
    this.me.data.txns = this.me.data.txns.filter((x) => x !== t).map((x) => (x.dupOf === id ? { ...x, dupOf: null } : x));
    return this.done('TRACKER_DELETED');
  }

  private notDuplicate(id: number): TrackerDemoResult {
    const t = this.txn(id);
    Object.assign(t, { status: 'pending', dupOf: null, dupWhy: null });
    return this.done('TRACKER_NOT_DUPLICATE');
  }

  private tracking(action: string): TrackerDemoResult {
    const tr = this.me.data.tracking;
    if (action === 'enable' || action === 'resume') {
      const wasPaused = tr.state === 'paused';
      tr.state = 'enabled';
      tr.since ??= iso(Date.now());
      if (wasPaused)
        this.notify('paused', null);
      return this.done(wasPaused ? 'TRACKER_TRACKING_RESUMED' : 'TRACKER_TRACKING_ON');
    }
    if (action === 'pause') {
      tr.state = 'paused';
      this.notify('paused', null);
      return this.done('TRACKER_TRACKING_PAUSED');
    }
    Object.assign(tr, { state: 'permission', since: null });
    this.notify('revoked', null);
    return this.done('TRACKER_TRACKING_REVOKED');
  }

  private firstGood(re: RegExp, b: string): string | null {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(b))) {
      const c = m[1].trim();
      if (c.length > 1 && !BAD_M.test(c) && !BAD_M2.test(c))
        return c;
    }
    return null;
  }

  private lookup(text: string): TrackerMerchantFound | null {
    const hit = MERCHANTS.find(([re]) => re.test(text));
    return hit ? { name: hit[1], cat: hit[2], kind: hit[3] ?? null, known: true, raw: null } : null;
  }

  private confidence(p: TrackerParsed, cat: string): number {
    let c = 30 + (p.amount ? 25 : 0) + (p.type ? 15 : 0) + (p.known ? 15 : p.merchant ? 7 : 0) + (p.account ? 4 : 0) + (p.ref ? 4 : 0) + (p.dateFound ? 3 : 0) + (p.method !== 'bank' ? 3 : 0);
    if (cat === 'other')
      c -= 8;
    if (p.ambiguous)
      c -= 10;
    if (!p.type)
      c = Math.min(c, 40);
    return Math.max(5, Math.min(99, c));
  }

  private categorize(p: TrackerParsed, body: string): string {
    if (p.merchant && this.me.rules[p.merchant.toLowerCase()])
      return this.me.rules[p.merchant.toLowerCase()];
    if (p.method === 'atm')
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
    return /electricity|recharge|broadband|\bdth\b|\bgas\b|\bbill\b/i.test(body) ? 'bills' : 'other';
  }

  private parse(b: string, receivedAt: number): TrackerParsed {
    const am = AMT_ALT_RE.exec(b) ?? AMT_RE.exec(b);
    const amount = am ? Number(am[1].replace(/,/g, '')) : 0;
    const isRefund = /\b(refund(?:ed)?|reversed|reversal)\b/i.test(b);
    const di = b.search(DEBIT_RE);
    const ci = b.search(CREDIT_RE);
    let type: 'debit' | 'credit' | null = null;
    if (isRefund && ci >= 0)
      type = 'credit';
    else if (di >= 0 && (ci < 0 || di < ci))
      type = 'debit';
    else if (ci >= 0)
      type = 'credit';
    const method = this.method(b);
    const acc = ACC_RE.exec(b);
    let ref: string | null = null;
    let refText: string | null = null;
    for (const re of REF_RES) {
      const r = re.exec(b);
      if (r && /\d/.test(r[1])) {
        ref = r[1].toUpperCase();
        refText = r[0];
        break;
      }
    }
    const date = this.parseDate(b, receivedAt);
    const merchant: TrackerMerchantFound = type ? this.extractMerchant(b, type, method) : { name: null, raw: null };
    return {
      amount: amount > 0 && isFinite(amount) ? amount : 0, amountText: am ? am[0] : null, type, ambiguous: di >= 0 && ci >= 0 && !isRefund, isRefund, method,
      account: acc ? 'XX' + acc[1].slice(-4) : null, accountText: acc ? acc[0] : null, ref, refText, at: date.at, dateFound: date.found,
      merchant: merchant.name, merchantRaw: merchant.raw, known: !!merchant.known, mCat: merchant.cat ?? null, mKind: merchant.kind ?? null, person: !!merchant.person,
    };
  }

  /** POST /tracker/sms: one pasted (or shared) SMS through the whole pipeline. The answer lists every step, as the prototype's device panel did. */
  private readSms(b: Record<string, unknown>): TrackerDemoResult {
    const body = String(b['body'] ?? '').replace(/\s+/g, ' ').trim();
    if (!body)
      throw new DemoFailure(400, 'TRACKER_SMS_EMPTY');
    if (body.length > RULES.maxSms)
      throw new DemoFailure(400, 'TRACKER_SMS_TOO_LONG', [RULES.maxSms]);
    const result = this.process(String(b['sender'] ?? '').trim() || this.guessSender(body), body, Date.now());
    this.save();
    return { data: { result, state: this.me.data } };
  }

  /** The fields of the manual form and of Edit, each checked as the API checks them. */
  private checked(b: Record<string, unknown>): TrackerTxnRequest {
    const amount = Math.round(Number(b['amount']) * 100) / 100;
    const type = b['type'] === 'credit' ? 'credit' : b['type'] === 'debit' ? 'debit' : null;
    const category = String(b['category'] ?? '');
    const method = String(b['method'] ?? '') as TrackerMethod;
    const at = new Date(String(b['at'] ?? ''));
    const merchant = String(b['merchant'] ?? '').trim() || null;
    const note = String(b['note'] ?? '').trim();
    if (!(amount > 0) || amount > RULES.maxAmount || !type || !TRACKER_CATEGORIES.some((c) => c.code === category) || !TRACKER_METHODS.includes(method) || isNaN(at.getTime()) || (merchant?.length ?? 0) > RULES.merchantLength || note.length > RULES.noteLength)
      throw new DemoFailure(400, 'TRACKER_INVALID');
    return { amount, type, category, method, at: iso(at.getTime()), merchant, note };
  }

  /**
   * POST /tracker/sms/import: one batch of an SMS backup, oldest first. Each message keeps the date it was received; one imported before (the same text
   * received at the same time) is only counted, so importing a backup again adds nothing. An import makes no alerts.
   */
  private importSms(b: Record<string, unknown>): TrackerDemoResult {
    const list = Array.isArray(b['messages']) ? (b['messages'] as Record<string, unknown>[]) : [];
    if (!list.length || list.length > RULES.maxImportBatch)
      throw new DemoFailure(400, 'TRACKER_INVALID');
    const result: TrackerImportResult = { already: 0, created: 0, skipped: 0, duplicates: 0 };
    const sorted = list.map((m) => ({ sender: String(m['sender'] ?? '').trim(), body: String(m['body'] ?? '').replace(/\s+/g, ' ').trim(), at: ms(String(m['receivedAt'] ?? '')) })).sort((x, y) => x.at - y.at);
    for (const m of sorted) {
      if (!m.body || m.body.length > RULES.maxSms || !(m.at > 0) || m.at > Date.now() + DAY)
        result.skipped++;
      else if (this.me.data.txns.some((t) => t.sms?.body === m.body && ms(t.sms.receivedAt) === m.at))
        result.already++;
      else {
        const outcome = this.process(m.sender, m.body, m.at, false).outcome;
        result[outcome === 'created' ? 'created' : outcome === 'duplicate' ? 'duplicates' : 'skipped']++;
      }
    }
    this.save();
    return { data: { result, state: this.me.data } };
  }

  private addManual(b: Record<string, unknown>): TrackerDemoResult {
    const r = this.checked(b);
    this.me.data.txns.push({ ...r, id: this.me.seq++, source: 'manual', typeGuessed: false, kind: null, account: null, ref: null, confidence: 100, status: 'confirmed', edited: false, dupOf: null, dupWhy: null, sms: null, createdAt: iso(Date.now()) });
    return this.done('TRACKER_ADDED');
  }

  private notify(type: TrackerAlertType, t: TrackerTxn | null): void {
    if (!this.me.data.settings.alerts[type])
      return;
    const args: Record<string, string | number> = t ? { merchant: t.merchant ?? '', amount: t.amount, credit: t.type === 'credit' ? 1 : 0 } : {};
    this.me.data.alerts.unshift({ id: this.me.alertSeq++, type, txnId: t?.id ?? null, args, read: false, at: iso(Date.now()) });
    this.me.data.alerts.length = Math.min(this.me.data.alerts.length, 60);
  }

  private saveSettings(b: Record<string, unknown>): TrackerDemoResult {
    const s = this.me.data.settings;
    const approval = String(b['approval'] ?? s.approval) as TrackerApproval;
    const threshold = Number(b['threshold'] ?? s.threshold);
    const alerts = (b['alerts'] ?? {}) as Record<string, unknown>;
    if (!['review', 'smart', 'auto'].includes(approval) || !Number.isInteger(threshold) || threshold < 50 || threshold > 99)
      throw new DemoFailure(400, 'TRACKER_INVALID');
    s.approval = approval;
    s.threshold = threshold;
    s.push = b['push'] === undefined ? s.push : !!b['push'];
    TRACKER_ALERT_TYPES.forEach((k) => (s.alerts[k] = alerts[k] === undefined ? s.alerts[k] : !!alerts[k]));
    return this.done('TRACKER_SETTINGS_SAVED');
  }

  private edit(id: number, b: Record<string, unknown>): TrackerDemoResult {
    const t = this.txn(id);
    Object.assign(t, this.checked(b), { edited: true, typeGuessed: false });
    if (t.status === 'pending')
      t.status = 'confirmed';
    return this.done('TRACKER_SAVED');
  }

  /** Saves and answers with a message and the whole SnapTracker data, so the app shows the change at once. */
  private done(code: string, args: (string | number)[] = []): TrackerDemoResult {
    this.save();
    return { code, args, data: this.me.data };
  }

  /** A new category; "remember" also files every later transaction of this merchant there (TrackerCategoryRules). */
  private setCategory(id: number, b: Record<string, unknown>): TrackerDemoResult {
    const t = this.txn(id);
    const category = String(b['category'] ?? '');
    if (!TRACKER_CATEGORIES.some((c) => c.code === category))
      throw new DemoFailure(400, 'TRACKER_INVALID');
    t.category = category;
    t.edited = true;
    if (b['remember'] && t.merchant) {
      this.me.rules[t.merchant.toLowerCase()] = category;
      return this.done('TRACKER_CATEGORY_RULE', [t.merchant]);
    }
    return this.done('TRACKER_CATEGORY_SAVED');
  }

  private parseDate(b: string, receivedAt: number): { at: number; found: boolean } {
    let d: Date | null = null;
    let m = DATE_RES[0].exec(b);
    const mi = m ? MON.indexOf(m[2].toLowerCase()) : -1;
    if (m && mi >= 0)
      d = new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), mi, +m[1]);
    else if ((m = DATE_RES[2].exec(b)))
      d = new Date(+m[1], +m[2] - 1, +m[3]);
    else if ((m = DATE_RES[1].exec(b)))
      d = new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1]);
    const r = new Date(receivedAt);
    if (!d || isNaN(d.getTime()) || d.getTime() > receivedAt + DAY || d.getTime() < receivedAt - 60 * DAY)
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
    return { at: Math.min(d.getTime(), receivedAt), found: true };
  }

  private setStatus(id: number, status: 'confirmed' | 'ignored', code: string): TrackerDemoResult {
    this.txn(id).status = status;
    return this.done(code);
  }

  private process(sender: string, body: string, receivedAt: number, alerts = true): TrackerSmsResult {
    const D = this.me.data;
    const steps: TrackerStep[] = [];
    const st = (where: 'phone' | 'server', key: string, ok: boolean, args: Record<string, string | number> = {}) => steps.push({ where, key, ok, args });
    const skip = (counter: keyof TrackerData['filtered'] | null, reason: string): TrackerSmsResult => {
      if (counter)
        D.filtered[counter]++;
      return { outcome: 'skipped', reason, steps, txn: null };
    };
    const m = /^(?:[A-Z]{2}-)?([A-Z0-9]{6})(?:-([TSPG]))?$/i.exec(sender);
    const code = m?.[1].toUpperCase() ?? '';
    const kind = (m?.[2] ?? 'T').toUpperCase();
    if (!m || !TRACKER_SENDERS[code]) {
      st('phone', 'sender', false, { sender: sender || '—' });
      return skip('other', 'notBank');
    }
    st('phone', 'sender', true, { name: TRACKER_SENDERS[code], kind: SENDER_KIND[kind] });
    if (OTP_WORD.test(body) && /\b\d{4,8}\b/.test(body) && !DONE_RE.test(body)) {
      st('phone', 'otp', false);
      return skip('otp', 'otp');
    }
    st('phone', 'otp', true);
    if (kind === 'P' || (PROMO_RE.test(body) && !TXN_RE.test(body))) {
      st('phone', 'promo', false, { why: kind === 'P' ? 'header' : 'words' });
      return skip('promo', 'promo');
    }
    st('phone', 'promo', true);
    if (FAILED_RE.test(body) && !SETTLED_REFUND_RE.test(body)) {
      st('server', 'status', false);
      return skip('failed', 'failed');
    }
    const p = this.parse(body, receivedAt);
    if (!p.amount) {
      st('server', 'amount', false);
      return skip('other', 'noAmount');
    }
    st('server', 'details', true, { amount: p.amount, type: p.type ?? '', method: p.method, account: p.account ?? '', ref: p.ref ?? '' });
    const category = this.categorize(p, body);
    const t: TrackerTxn = {
      id: this.me.seq++, source: 'sms', type: p.type ?? 'debit', typeGuessed: !p.type, amount: p.amount, merchant: p.merchant, category, kind: p.mKind, method: p.method as TrackerMethod,
      account: p.account, ref: p.ref, at: iso(p.at), confidence: 0, status: 'pending', note: '', edited: false, dupOf: null, dupWhy: null, createdAt: iso(receivedAt),
      sms: { sender: sender.toUpperCase(), senderName: TRACKER_SENDERS[code], body, receivedAt: iso(receivedAt), marks: [p.amountText, p.merchantRaw, p.accountText, p.refText].filter((x): x is string => !!x) },
    };
    t.confidence = this.confidence(p, category);
    st('server', 'category', true, { category, found: p.known ? 'known' : p.merchant ? 'text' : 'none' });
    const dup = this.findDuplicate(t);
    if (dup) {
      t.status = 'duplicate';
      t.dupOf = dup.x.id;
      t.dupWhy = dup.why;
      st('server', 'duplicate', false, { why: dup.why, ref: t.ref ?? '' });
    } else {
      st('server', 'duplicate', true);
      const mode = D.settings.approval;
      const sure = !!p.type && t.confidence >= D.settings.threshold;
      t.status = mode === 'auto' ? (p.type ? 'auto' : 'pending') : mode === 'smart' && sure ? 'auto' : 'pending';
    }
    D.txns.push(t);
    st('server', 'save', true, { status: t.status, confidence: t.confidence });
    if (!alerts)
      return { outcome: t.status === 'duplicate' ? 'duplicate' : 'created', reason: null, txn: t, steps };
    this.notify(t.status === 'duplicate' ? 'duplicate' : 'newTx', t);
    if (t.status === 'auto')
      this.notify('categorized', t);
    if (t.status === 'pending')
      this.notify('verify', t);
    return { outcome: t.status === 'duplicate' ? 'duplicate' : 'created', reason: null, txn: t, steps };
  }

  private extractMerchant(b: string, type: 'debit' | 'credit', method: TrackerMethod): TrackerMerchantFound {
    if (method === 'atm')
      return { name: 'ATM', raw: null, cat: 'cash', known: true };
    let raw: string | null = null;
    let vpa: string | null = null;
    const p2m = P2M_RE.exec(b);
    const v = VPA_RE.exec(b);
    if (p2m)
      raw = p2m[1].trim();
    else if (v) {
      raw = v[1];
      vpa = v[1];
    } else
      for (const re of type === 'credit' ? [M_FROM, M_AT, M_FOR, M_TO] : [M_AT, M_TO, M_FOR])
        if ((raw = this.firstGood(re, b)))
          break;
    const dict = (raw && this.lookup(raw)) || this.lookup(b.replace(/\b[A-Z]{2}-[A-Z0-9]{6}\b/g, ''));
    if (dict)
      return { ...dict, raw };
    if (vpa) {
      const words = vpa.split('@')[0].replace(/\d+/g, ' ').split(/[._\-\s]+/).filter((w) => w.length > 1);
      return words.length ? { name: titleCase(words.join(' ')), raw, cat: 'transfer', person: true } : { name: null, raw };
    }
    if (!raw)
      return { name: null, raw: null };
    const clean = raw.replace(/\s{2,}/g, ' ').trim();
    const business = /\b(pvt|ltd|llp|limited|store|stores|mart|general|services|enterprises|traders|shop|medical|bill|electricity|recharge|restaurant|cafe|hotel)\b/i.test(clean);
    const person = !business && ['upi', 'neft', 'imps', 'rtgs', 'bank'].includes(method) && /^[A-Za-z]+(?: [A-Za-z]+){1,2}$/.test(clean);
    return { name: titleCase(clean), raw, cat: person ? 'transfer' : null, person };
  }

  /** The same message twice, the same reference number (bank and UPI app both sent one), or the same amount, direction and merchant within 10 minutes. */
  private findDuplicate(t: TrackerTxn): { x: TrackerTxn; why: 'sameText' | 'sameRef' | 'sameAmount' } | null {
    for (const x of this.me.data.txns) {
      if (x.id === t.id || x.status === 'duplicate')
        continue;
      if (t.sms && x.sms && x.sms.body === t.sms.body && Math.abs(ms(x.sms.receivedAt) - ms(t.sms.receivedAt)) < DAY)
        return { x, why: 'sameText' };
      if (t.ref && x.ref === t.ref && x.type === t.type)
        return { x, why: 'sameRef' };
      if (x.amount === t.amount && x.type === t.type && Math.abs(ms(x.at) - ms(t.at)) <= RULES.duplicateMinutes * MIN && (!t.merchant || !x.merchant || x.merchant === t.merchant) && (!t.account || !x.account || t.account === x.account))
        return { x, why: 'sameAmount' };
    }
    return null;
  }

  // #endregion
}
