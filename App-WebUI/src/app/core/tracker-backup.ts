import { TRACKER_SENDERS } from './tracker-meta';
import { TrackerBackup, TrackerImportSms } from './models/tracker.model';

/** How many messages one import call carries (Tracker:Limits:MaxImportBatch of the API). */
export const TRACKER_IMPORT_BATCH = 200;

/** A message of SMS Backup & Restore: <sms address="AD-HDFCBK" date="1730876400000" type="1" body="…" />. Quoted values may hold ">". */
const SMS_TAG = /<sms\b((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*\/?>/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*"([^"]*)"/g;

/** A bank or payment app header: AD-HDFCBK-S, VM-HDFCBK or a bare HDFCBK. */
const SENDER = /^(?:[A-Z]{2}-)?([A-Z0-9]{6})(?:-[TSPG])?$/;
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The text of an XML attribute: &amp;, &#10;, &#x1F600; and the like back to their characters. */
const decode = (s: string): string => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => (e[0] !== '#' ? ENTITIES[e.toLowerCase()] : String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))));

/**
 * Reads an SMS Backup & Restore file (.xml) on this device. Only received messages (type 1) from the listed banks and payment apps are kept, so personal
 * messages never leave the phone; the rest of the pipeline (OTP, offers, failed payments, duplicates) runs on the server as for a pasted SMS.
 * Null when the file is not such a backup.
 */
export function readSmsBackup(xml: string): TrackerBackup | null {
  if (!xml.includes('<smses'))
    return null;
  let total = 0;
  const messages: TrackerImportSms[] = [];
  for (const tag of xml.matchAll(SMS_TAG)) {
    total++;
    const a: Record<string, string> = {};
    for (const x of tag[1].matchAll(ATTRIBUTE))
      a[x[1]] = x[2];
    const sender = decode(a['address'] ?? '').trim().toUpperCase();
    const code = SENDER.exec(sender)?.[1] ?? '';
    const body = decode(a['body'] ?? '').trim();
    const at = Number(a['date']);
    if (a['type'] === '1' && TRACKER_SENDERS[code] && body && at > 0)
      messages.push({ sender, body, receivedAt: new Date(at).toISOString() });
  }
  messages.sort((x, y) => x.receivedAt.localeCompare(y.receivedAt));
  return { total, messages };
}
