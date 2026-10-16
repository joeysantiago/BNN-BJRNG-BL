/**
 * Local helper for the /youtube page. Run it next to `ng serve` with `npm run youtube`.
 *
 * The page cannot read YouTube streams from the browser (CORS), so this small server does it:
 *   GET /api/search?q=text   -> list of videos
 *   GET /api/info/:id        -> title, artist, duration, thumbnail of one video
 *   GET /api/playlist/:id    -> videos of a playlist
 *   GET /api/stream/:id      -> the audio-only stream, forwarded with Range support
 *   GET /api/download/:id    -> the song as a 320 kbps MP3 file download (uses ffmpeg-static, or YT_FFMPEG)
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
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import { timingSafeEqual } from 'node:crypto';
import { Innertube, UniversalCache } from 'youtubei.js';

const PORT = Number(process.env.YT_PORT) || 8787;
const HOST = process.env.YT_HOST || '127.0.0.1';
const TOKEN = process.env.YT_TOKEN || '';
const FFMPEG = process.env.YT_FFMPEG || ffmpegPath || 'ffmpeg';
const EXTRA = (process.env.YT_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const ORIGINS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{10,64}$/;
const URL_TTL = 20 * 60 * 1000;
const CHUNK = 1024 * 1024;

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
  // YouTube refuses open-ended ranges ("bytes=0-", which is what a browser asks for first) and any Range header after the
  // first chunk. Its own players ask for a piece with the "range" URL parameter instead, so every request is cut into a
  // bounded chunk that way. The browser gets a 206 with the real total size and asks for the next chunk when it needs it.
  const total = Number(new URL(entry.url).searchParams.get('clen')) || 0;
  const asked = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  const start = asked ? Number(asked[1]) : 0;
  if (total && start >= total)
    return send(res, 416, { error: 'range not satisfiable' }, { 'Content-Range': `bytes */${total}` });
  let end = asked?.[2] ? Math.min(Number(asked[2]), start + CHUNK - 1) : start + CHUNK - 1;
  if (total)
    end = Math.min(end, total - 1);
  const upstream = await fetch(`${entry.url}&range=${start}-${end}`);
  if (!upstream.ok && upstream.status !== 206) {
    urls.delete(id);
    return send(res, 502, { error: `upstream ${upstream.status}` });
  }
  const headers = {
    'Content-Type': entry.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Range': `bytes ${start}-${end}/${total || '*'}`,
    // The page asks with crossorigin="anonymous"; without CORS the browser blocks every chunk after the first (ORB).
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  };
  if (upstream.headers.get('content-length'))
    headers['Content-Length'] = upstream.headers.get('content-length');
  res.writeHead(206, headers);
  Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
  res.on('close', () => upstream.body.cancel().catch(() => undefined));
};

/** Downloads the whole audio stream chunk by chunk and converts it to a 320 kbps MP3 with ffmpeg while sending it. */
const download = async (res, id) => {
  const entry = await resolve(id);
  const total = Number(new URL(entry.url).searchParams.get('clen')) || 0;
  const name = `${entry.video.title.replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || id}.mp3`;
  const ffmpeg = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-codec:a', 'libmp3lame', '-b:a', '320k', '-metadata', `title=${entry.video.title}`, '-metadata', `artist=${entry.video.artist}`, '-f', 'mp3', 'pipe:1']);
  ffmpeg.on('error', () => res.destroy());
  ffmpeg.stdin.on('error', () => undefined);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
    'Access-Control-Expose-Headers': 'Content-Disposition',
  });
  ffmpeg.stdout.pipe(res);
  res.on('close', () => ffmpeg.kill());
  try {
    for (let start = 0; !total || start < total; start += CHUNK) {
      const upstream = await fetch(`${entry.url}&range=${start}-${start + CHUNK - 1}`);
      if (!upstream.ok && upstream.status !== 206) {
        urls.delete(id);
        break;
      }
      const part = Buffer.from(await upstream.arrayBuffer());
      if (!part.length)
        break;
      if (!ffmpeg.stdin.write(part))
        await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
      if (!total && part.length < CHUNK)
        break;
    }
  } finally {
    ffmpeg.stdin.end();
  }
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
  if (action === 'download' && VIDEO_ID.test(param ?? ''))
    return download(res, param);
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
