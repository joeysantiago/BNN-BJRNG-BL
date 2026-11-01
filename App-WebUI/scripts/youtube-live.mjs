/**
 * One command to use the helper from the live site (https://thakurg.com) on any device:  npm run youtube:live
 * It starts the helper with a private key, opens a free Cloudflare HTTPS tunnel to it and prints the two values the page asks for.
 * Needs cloudflared once:  winget install Cloudflare.cloudflared   (Windows)  |  brew install cloudflared   (Mac)
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const KEY_FILE = '.youtube-token';
const PORT = process.env.YT_PORT || '8787';
const token = existsSync(KEY_FILE) ? readFileSync(KEY_FILE, 'utf8').trim() : randomBytes(16).toString('hex');
writeFileSync(KEY_FILE, token);

const env = { ...process.env, YT_TOKEN: token, YT_PORT: PORT };
const server = spawn(process.execPath, ['scripts/youtube-server.mjs'], { env, stdio: 'inherit' });
const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${PORT}`], { stdio: ['ignore', 'ignore', 'pipe'] });

tunnel.on('error', () => {
  console.error('\ncloudflared is not installed. Install it once (winget install Cloudflare.cloudflared), reopen the terminal and run again.');
  server.kill();
  process.exit(1);
});
let shown = false;
tunnel.stderr.on('data', (d) => {
  const url = /https:\/\/[\w-]+\.trycloudflare\.com/.exec(String(d))?.[0];
  if (!url || shown) return;
  shown = true;
  console.log(`\n=== Enter these two values on https://thakurg.com/#/youtube ===\n  Server address: ${url}\n  Server key:     ${token}\n(The address changes every time you run this; the key stays the same. Keep this window open.)\n`);
});
const stop = () => {
  server.kill();
  tunnel.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
