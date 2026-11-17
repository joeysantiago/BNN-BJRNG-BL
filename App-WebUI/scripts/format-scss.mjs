/**
 * Makes the SCSS files readable (App-Document/scss-readable-format.md):
 *  1. Prettier with the project's .prettierrc: one declaration per line, 2-space indent, long value lists split.
 *  2. One blank line between top-level rules (Prettier keeps blank lines but does not add them).
 *  3. A safety check: the file is compiled with Sass before and after, and it is written only when the CSS is identical,
 *     so the formatting can never change how a page looks. A file that does not compile on its own is formatted but reported.
 * Usage: npm run format:scss            (every .scss under src/)
 *        npm run format:scss -- <files> (only the given files)
 *        npm run format:scss -- --check (lists the files that are not formatted yet; exits 1 if any)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import * as sass from 'sass';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const given = args.filter((a) => a !== '--check').map((a) => resolve(a));

function scssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? scssFiles(path) : path.endsWith('.scss') ? [path] : [];
  });
}

/** A blank line after every top-level closing brace that is not already followed by one. */
function spaceRules(text, eol) {
  const lines = text.split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    out.push(line);
    if (line === '}' && i < lines.length - 1 && lines[i + 1] !== '')
      out.push('');
  });
  return out.join(eol);
}

/** The compiled CSS with whitespace made uniform: Sass keeps custom-property values (--x: ...) as written, so a value Prettier splits over lines differs only in spaces. */
function compile(text, file) {
  try {
    const css = sass.compileString(text, { url: new URL('file:///' + file.replace(/\\/g, '/')), loadPaths: [dirname(file), join(root, 'src'), join(root, 'node_modules')], style: 'compressed', silenceDeprecations: ['import'] }).css;
    return css.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')');
  } catch {
    return null;
  }
}

const files = given.length ? given : scssFiles(join(root, 'src'));
let changed = 0;
let unformatted = 0;
let unchecked = 0;
let refused = 0;

for (const file of files) {
  const name = relative(root, file);
  const before = readFileSync(file, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const options = { ...(await prettier.resolveConfig(file)), filepath: file, endOfLine: eol === '\r\n' ? 'crlf' : 'lf' };
  const after = spaceRules(await prettier.format(before, options), eol);
  if (after === before)
    continue;
  if (check) {
    unformatted++;
    console.log('not formatted: ' + name);
    continue;
  }
  const cssBefore = compile(before, file);
  const cssAfter = compile(after, file);
  if (cssBefore !== null && cssBefore !== cssAfter) {
    refused++;
    console.log('REFUSED (compiled CSS would change): ' + name);
    continue;
  }
  if (cssBefore === null) {
    unchecked++;
    console.log('formatted, not compiled on its own (check it): ' + name);
  }
  writeFileSync(file, after);
  changed++;
}

if (check) {
  console.log(unformatted ? `${unformatted} file(s) not formatted. Run: npm run format:scss` : 'All SCSS files are formatted.');
  process.exit(unformatted ? 1 : 0);
}
console.log(`${changed} file(s) formatted, ${refused} refused, ${unchecked} not compiled on their own, ${files.length - changed - refused} already formatted.`);
process.exit(refused ? 1 : 0);
