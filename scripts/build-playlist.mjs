/**
 * Scans public/audio and writes public/audio/playlist.json, so the /creta player lists every audio file by itself.
 * Runs before `npm start` and `npm run build`. Nothing needs to be edited by hand.
 *
 *  - Audio files: mp3, m4a, aac, ogg, oga, opus, wav, flac, weba
 *  - Title: taken from the file name ("01 - My_Song 320 Kbps.mp3" becomes "My Song")
 *  - Cover: an image with the same name as the audio file (my-song.mp3 + my-song.jpg)
 *  - Order: by file name, with numbers sorted naturally (2 before 10)
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public', 'audio');
const AUDIO = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.flac', '.weba']);
const IMAGES = ['.jpg', '.jpeg', '.png', '.webp'];

const files = readdirSync(dir).filter((f) => AUDIO.has(extname(f).toLowerCase()));
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const title = (file) =>
  parse(file)
    .name.replace(/[_]+/g, ' ')
    .replace(/\s*[\[(]?\s*\d{2,3}\s*kbps\s*[\])]?/gi, '')
    .replace(/^\s*\d{1,3}\s*[-.)]\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || parse(file).name;

const tracks = files.map((file) => {
  const base = parse(file).name;
  const cover = IMAGES.map((e) => base + e).find((c) => readdirSync(dir).some((f) => f.toLowerCase() === c.toLowerCase()));
  const actual = cover && readdirSync(dir).find((f) => f.toLowerCase() === cover.toLowerCase());
  return { title: title(file), file, ...(actual ? { cover: actual } : {}) };
});

writeFileSync(join(dir, 'playlist.json'), JSON.stringify({ tracks }, null, 2) + '\n');
console.log(`playlist: ${tracks.length} track${tracks.length === 1 ? '' : 's'} found in public/audio`);
tracks.forEach((t) => console.log('  - ' + t.title));
if (!existsSync(dir)) process.exit(1);
