/**
 * Renders the share images (public/og/*.png, 1200 x 630) and the app icons (public/icons/*.png, public/favicon.ico)
 * with headless Chrome or Edge. Run it with:  npm run images
 * Edit the cards below and run it again to change the pictures.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outOg = join(root, 'public', 'og');
const outIcons = join(root, 'public', 'icons');
mkdirSync(outOg, { recursive: true });
mkdirSync(outIcons, { recursive: true });

const browser = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p));
if (!browser) throw new Error('Chrome or Edge not found. Set CHROME_PATH to the browser executable.');

const work = join(tmpdir(), 'thakurg-images');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

function shot(html, out, w, h, transparent = false) {
  const file = join(work, `${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  const profile = join(work, 'profile');
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      `--window-size=${w},${h}`,
      `--default-background-color=${transparent ? '00000000' : 'FF000000'}`,
      '--force-device-scale-factor=1',
      '--virtual-time-budget=4000',
      `--screenshot=${out}`,
      pathToFileURL(file).href,
    ],
    { stdio: 'ignore' },
  );
}

const FONT = `font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;`;
const page = (body, css = '') => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%;overflow:hidden}
body{${FONT}color:#f5ecf7;background:#170a1c;position:relative}
${css}</style>${body}`;

/* ---------- Share cards, 1200 x 630 ---------- */
const GOLD = '#e3bd68';
const frame = (inner, css = '') =>
  page(
    `<div class="bg"></div><div class="blob a"></div><div class="blob b"></div>${inner}<div class="brand">thakurg.com</div>`,
    `.bg{position:absolute;inset:0;background:linear-gradient(135deg,#170a1c 0%,#2a0f28 55%,#3a1631 100%)}
.blob{position:absolute;border-radius:50%;filter:blur(70px)}
.a{width:560px;height:560px;right:-120px;top:-160px;background:rgba(217,178,92,.32)}
.b{width:520px;height:520px;left:-160px;bottom:-220px;background:rgba(157,74,130,.5)}
.brand{position:absolute;left:72px;bottom:48px;font-size:30px;font-weight:700;color:#f0d68c;letter-spacing:.02em}
.glass{background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);border-radius:32px;box-shadow:0 30px 70px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.14)}
h1{position:absolute;left:72px;top:150px;width:560px;font-size:76px;line-height:1.04;font-weight:800;letter-spacing:-.02em}
h1 em{font-style:normal;color:${GOLD}}
.sub{position:absolute;left:72px;top:408px;width:520px;font-size:32px;line-height:1.35;color:#d8cadf}
${css}`,
  );

const gauge = (pct, size = 360) => `<svg width="${size}" height="${size * 0.8}" viewBox="-16 -8 272 216">
<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e3bd68"/><stop offset="1" stop-color="#fbe9b3"/></linearGradient></defs>
<path d="M52.12 187.88A96 96 0 1 1 187.88 187.88" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="14" stroke-linecap="round"/>
<path d="M52.12 187.88A96 96 0 1 1 187.88 187.88" fill="none" stroke="url(#g)" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100"/></svg>`;

const cards = {
  speedtest: frame(
    `<h1>Free Internet <em>Speed Test</em></h1>
<p class="sub">Download, upload, ping and jitter in 25 seconds. English, Hindi, Arabic.</p>
<div class="glass dial"><div class="gw">${gauge(66, 380)}</div><div class="num"><b>245</b><span>Mbps download</span></div>
<div class="chips"><div><small>UPLOAD</small><b>48<i>Mbps</i></b></div><div><small>PING</small><b>12<i>ms</i></b></div></div></div>`,
    `.dial{position:absolute;right:64px;top:84px;width:470px;height:462px;padding:34px 30px}
.gw{display:flex;justify-content:center}
.num{position:absolute;left:0;right:0;top:182px;text-align:center}
.num b{display:block;font-size:92px;line-height:1;font-weight:800}
.num span{font-size:24px;color:#d8cadf;font-weight:600}
.chips{position:absolute;left:30px;right:30px;bottom:30px;display:flex;gap:16px}
.chips div{flex:1;background:rgba(0,0,0,.28);border-radius:20px;padding:12px 18px}
.chips small{display:block;font-size:17px;letter-spacing:.1em;color:#cfc1d6;font-weight:700}
.chips b{font-size:44px;font-weight:800}.chips i{font-style:normal;font-size:20px;color:${GOLD};margin-left:6px}`,
  ),

  hr: frame(
    `<h1><em>Atrium</em> HR</h1>
<p class="sub">Attendance, leave and payroll in one place.</p>
<div class="glass dash">
 <div class="kpis"><div><small>PRESENT</small><b>128</b></div><div><small>ON LEAVE</small><b>9</b></div><div><small>ROLES</small><b>14</b></div></div>
 <div class="bars">${[44, 62, 52, 78, 66, 90, 74].map((h) => `<i style="height:${h}%"></i>`).join('')}</div>
 <div class="pay"><small>NEXT PAYROLL</small><b>Oct 31</b></div>
</div>`,
    `h1{font-size:104px;top:140px}
.dash{position:absolute;right:64px;top:84px;width:480px;height:462px;padding:30px}
.kpis{display:flex;gap:12px}
.kpis div{flex:1;background:rgba(0,0,0,.28);border-radius:18px;padding:12px 14px}
.kpis small,.pay small{display:block;font-size:15px;letter-spacing:.1em;color:#cfc1d6;font-weight:700}
.kpis b{font-size:46px;font-weight:800}
.bars{display:flex;align-items:flex-end;gap:14px;height:130px;margin:26px 0 24px;padding:0 6px}
.bars i{flex:1;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,#f6dc98,#c9972f)}
.pay{background:rgba(0,0,0,.28);border-radius:18px;padding:14px 18px}
.pay b{font-size:40px;font-weight:800;color:${GOLD}}`,
  ),

  creta: frame(
    `<h1><em>Creta</em> Audio Player</h1>
<p class="sub">Play music online with a playlist, shuffle and repeat.</p>
<div class="glass pl">
 <div class="disc"><div class="hole"></div></div>
 <div class="title"><b>Now playing</b><span>Creta</span></div>
 <div class="wave">${Array.from({ length: 26 }, (_, i) => `<i style="height:${20 + Math.abs(Math.sin(i * 0.7)) * 70}%"></i>`).join('')}</div>
 <div class="ctl"><s></s><u></u><s></s></div>
</div>`,
    `h1{font-size:84px;top:140px;width:580px}
.pl{position:absolute;right:64px;top:84px;width:470px;height:462px;padding:30px 34px;text-align:center}
.disc{width:150px;height:150px;margin:0 auto 14px;border-radius:50%;background:conic-gradient(from 30deg,#2a0f28,#6b2d57,#2a0f28,#e3bd68 30%,#2a0f28 40%,#6b2d57,#2a0f28);box-shadow:0 18px 40px rgba(0,0,0,.5);display:grid;place-items:center}
.hole{width:56px;height:56px;border-radius:50%;background:#170a1c;border:6px solid #e3bd68}
.title b{display:block;font-size:34px;font-weight:800}.title span{color:#cfc1d6;font-size:22px}
.wave{display:flex;align-items:center;gap:6px;height:52px;margin:18px 10px}
.wave i{flex:1;border-radius:4px;background:linear-gradient(180deg,#f6dc98,#c9972f)}
.ctl{display:flex;align-items:center;justify-content:center;gap:28px}
.ctl s,.ctl u{display:block;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.12);text-decoration:none}
.ctl u{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#e3bd68,#f6dc98)}`,
  ),

  default: frame(
    `<h1><em>thakurg</em>.com</h1>
<p class="sub">Free tools: internet speed test, Atrium HR demo and the Creta audio player.</p>
<div class="tiles">
 <div class="glass"><b>Speed</b><span>Test</span></div>
 <div class="glass"><b>Atrium</b><span>HR</span></div>
 <div class="glass"><b>Creta</b><span>Audio</span></div>
</div>`,
    `h1{font-size:110px;top:150px;width:600px}
.tiles{position:absolute;right:64px;top:110px;width:440px;display:grid;gap:22px}
.tiles .glass{padding:26px 34px;border-radius:28px}
.tiles b{display:block;font-size:54px;font-weight:800}
.tiles span{font-size:28px;color:${GOLD};font-weight:700}`,
  ),
};

for (const [name, html] of Object.entries(cards)) {
  shot(html, join(outOg, `${name}.png`), 1200, 630);
  console.log('og/' + name + '.png');
}

/* ---------- Icons ---------- */
const glyph = (size, stroke) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`;
const icon = (size, { radius, glyphScale }) =>
  page(
    `<div class="t"><div class="g">${glyph(size * glyphScale, '#241208')}</div></div>`,
    `body{background:transparent}.t{position:absolute;inset:0;border-radius:${radius}px;display:grid;place-items:center;background:linear-gradient(145deg,#f6dc98,#d9b25c 55%,#b8862c);box-shadow:inset 0 ${size * 0.01}px 0 rgba(255,255,255,.5)}
.g{display:grid;place-items:center}`,
  );

shot(icon(192, { radius: 44, glyphScale: 0.62 }), join(outIcons, 'icon-192.png'), 192, 192, true);
shot(icon(512, { radius: 118, glyphScale: 0.62 }), join(outIcons, 'icon-512.png'), 512, 512, true);
shot(icon(512, { radius: 0, glyphScale: 0.46 }), join(outIcons, 'maskable-512.png'), 512, 512);
shot(icon(180, { radius: 0, glyphScale: 0.58 }), join(outIcons, 'apple-touch-icon.png'), 180, 180);
const fav = join(work, 'fav48.png');
shot(icon(48, { radius: 11, glyphScale: 0.66 }), fav, 48, 48, true);

// A favicon.ico that wraps the 48 x 48 PNG.
const png = readFileSync(fav);
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); // reserved
head.writeUInt16LE(1, 2); // type: icon
head.writeUInt16LE(1, 4); // one image
head.writeUInt8(48, 6); // width
head.writeUInt8(48, 7); // height
head.writeUInt16LE(1, 10); // colour planes
head.writeUInt16LE(32, 12); // bits per pixel
head.writeUInt32LE(png.length, 14);
head.writeUInt32LE(22, 18);
writeFileSync(join(root, 'public', 'favicon.ico'), Buffer.concat([head, png]));
console.log('icons and favicon.ico');
rmSync(work, { recursive: true, force: true });
