/**
 * Local helper for the /youtube page. Run it next to `ng serve` with `npm run youtube`.
 *
 * The page cannot read YouTube streams from the browser (CORS), so this small server does it:
 *   GET /api/search?q=text   -> list of videos
 *   GET /api/info/:id        -> title, artist, duration, thumbnail of one video
 *   GET /api/playlist/:id    -> videos of a playlist
 *   GET /api/stream/:id      -> the audio-only stream, forwarded with Range support
 *
 * It only plays audio, so no video and no ad is ever requested. It is for private learning use.
 *
 * Settings (environment variables):
 *   YT_PORT     port, default 8787
 *   YT_HOST     address to listen on, default 127.0.0.1 (this computer only)
 *   YT_ORIGINS  extra page origins allowed to call it, comma separated, for example https://thakurg.com
 *   YT_TOKEN    secret key every request must carry as ?key=. Required whenever YT_HOST is not 127.0.0.1.
 *
 * To use the GitHub-hosted page, keep this running on your computer and open an HTTPS tunnel to it
 * (for example: cloudflared tunnel --url http://127.0.0.1:8787), then enter the tunnel address and key on the page.
 */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { Innertube, UniversalCache } from 'youtubei.js';

const PORT = Number(process.env.YT_PORT) || 8787;
const HOST = process.env.YT_HOST || '127.0.0.1';
const TOKEN = process.env.YT_TOKEN || '';
const EXTRA = (process.env.YT_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const ORIGINS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{10,64}$/;
const URL_TTL = 20 * 60 * 1000;

if (HOST !== '127.0.0.1' && !TOKEN) {
  console.error('Set YT_TOKEN before listening on anything other than 127.0.0.1.');
  process.exit(1);
}

const allowed = (origin) => ORIGINS.test(origin) || EXTRA.includes(origin);
const keyOk = (key) => {
  if (!TOKEN)
    return true;
  const a = Buffer.from(key);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
};

let tube = null;
const urls = new Map();

const client = async () => (tube ??= await Innertube.create({ cache: new UniversalCache(false) }));

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
};

const toVideo = (v) => ({
  id: v.video_id ?? v.id,
  title: v.title?.text ?? String(v.title ?? ''),
  artist: v.author?.name ?? v.channel?.name ?? '',
  duration: v.duration?.seconds ?? 0,
  thumb: `https://i.ytimg.com/vi/${v.video_id ?? v.id}/mqdefault.jpg`,
});

/** The iOS client returns plain audio URLs that need no script to decode. */
const resolve = async (id) => {
  const hit = urls.get(id);
  if (hit && hit.until > Date.now())
    return hit;
  const yt = await client();
  const info = await yt.getBasicInfo(id, { client: 'IOS' });
  const format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'mp4a' });
  const url = format.url ?? (await format.decipher(yt.session.player));
  const entry = {
    url,
    mime: format.mime_type.split(';')[0],
    until: Date.now() + URL_TTL,
    video: toVideo({ video_id: id, title: info.basic_info.title, author: { name: info.basic_info.author }, duration: { seconds: info.basic_info.duration } }),
  };
  urls.set(id, entry);
  return entry;
};

const stream = async (req, res, id) => {
  const entry = await resolve(id);
  const range = req.headers.range ?? 'bytes=0-';
  const upstream = await fetch(entry.url, { headers: { Range: range } });
  if (!upstream.ok && upstream.status !== 206) {
    urls.delete(id);
    return send(res, 502, { error: `upstream ${upstream.status}` });
  }
  const headers = { 'Content-Type': entry.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  for (const h of ['content-length', 'content-range'])
    if (upstream.headers.get(h))
      headers[h] = upstream.headers.get(h);
  res.writeHead(upstream.status, headers);
  Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
  res.on('close', () => upstream.body.cancel().catch(() => undefined));
};

const handle = async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const [, api, action, param] = url.pathname.split('/');
  if (api !== 'api')
    return send(res, 404, { error: 'not found' });
  if (!keyOk(url.searchParams.get('key') ?? ''))
    return send(res, 401, { error: 'wrong key' });

  if (action === 'health')
    return send(res, 200, { ok: true });
  if (action === 'search') {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200);
    if (!q)
      return send(res, 400, { error: 'missing q' });
    const results = await (await client()).search(q, { type: 'video' });
    return send(res, 200, results.results.filter((r) => r.type === 'Video').slice(0, 20).map(toVideo));
  }
  if (action === 'info' && VIDEO_ID.test(param ?? ''))
    return send(res, 200, (await resolve(param)).video);
  if (action === 'playlist' && LIST_ID.test(param ?? '')) {
    const list = await (await client()).getPlaylist(param);
    return send(res, 200, list.items.filter((i) => i.type === 'PlaylistVideo').map(toVideo));
  }
  if (action === 'stream' && VIDEO_ID.test(param ?? ''))
    return stream(req, res, param);
  return send(res, 404, { error: 'not found' });
};

createServer((req, res) => {
  const origin = req.headers.origin;
  const cors = origin && allowed(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Allow-Methods': 'GET' });
    return res.end();
  }
  if (req.method !== 'GET')
    return send(res, 405, { error: 'method not allowed' }, cors);
  res.setHeader('Access-Control-Allow-Origin', cors['Access-Control-Allow-Origin'] ?? 'null');
  handle(req, res).catch((e) => {
    if (!res.headersSent)
      send(res, 500, { error: String(e.message ?? e) }, cors);
    else
      res.destroy();
  });
}).listen(PORT, HOST, () => console.log(`youtube helper on http://${HOST}:${PORT}`));
