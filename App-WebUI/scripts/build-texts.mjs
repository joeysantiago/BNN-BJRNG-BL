// Writes the texts of the site into public/i18n/ before every build, straight from the database seed scripts (the single source of the texts):
//   en.json, hi.json, ar.json  every text key of the Translations table, merged the same way as GET /translations/{lang} (English, then the language on top)
//   page-names.json            the PageNames table: { pageCode: { en, hi, ar } }
// The site shows these at once, so a page never waits for a sleeping API, and replaces them with the API's texts as soon as the API answers.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = join(root, '..', 'App-Database', 'DatabaseInitializer', 'SqlScripts', 'INSERT', 'Common');
const out = join(root, 'public', 'i18n');
const sqlText = (s) => s.replace(/''/g, "'");

// Each Translations row is ('pageCode', N'{Eng}', N'{Hin}', N'{Arab}'), with comment lines between the values.
const translations = readFileSync(join(seed, '007_Translations.sql'), 'utf8');
const row = /\(\s*'([^']+)',((?:\s*(?:--[^\n]*)?\s*N'(?:[^']|'')*',?){3})\s*\)/g;
const value = /N'((?:[^']|'')*)'/g;
const dicts = { en: {}, hi: {}, ar: {} };
let rows = 0;
for (const [, page, values] of translations.matchAll(row)) {
  const [eng, hin, arab] = [...values.matchAll(value)].map((m) => JSON.parse(sqlText(m[1])));
  if (!eng || !hin || !arab)
    throw new Error(`Translations row "${page}" does not have the three languages.`);
  Object.assign(dicts.en, eng);
  Object.assign(dicts.hi, eng, Object.fromEntries(Object.entries(hin).filter(([, t]) => t?.trim())));
  Object.assign(dicts.ar, eng, Object.fromEntries(Object.entries(arab).filter(([, t]) => t?.trim())));
  rows++;
}
if (!rows || !Object.keys(dicts.en).length)
  throw new Error('No texts found in 007_Translations.sql.');

const names = {};
for (const [, page, lang, name] of readFileSync(join(seed, '004_PageNames.sql'), 'utf8').matchAll(/\(\s*'(\w+)',\s*'(en|hi|ar)',\s*N'((?:[^']|'')*)'\s*\)/g))
  (names[page] ??= {})[lang] = sqlText(name);

mkdirSync(out, { recursive: true });
for (const [lang, dict] of Object.entries(dicts))
  writeFileSync(join(out, `${lang}.json`), JSON.stringify(dict));
writeFileSync(join(out, 'page-names.json'), JSON.stringify(names));
console.log(`texts: ${Object.keys(dicts.en).length} keys from ${rows} pages, ${Object.keys(names).length} page names -> public/i18n/`);
