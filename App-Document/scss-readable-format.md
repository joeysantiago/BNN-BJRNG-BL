Keep every SCSS file readable: one declaration per line and a blank line between rules, in the specified scope (App-WebUI).

Rule:
- Every `.scss` file under `App-WebUI/src` is formatted with **Prettier** and the project's `App-WebUI/.prettierrc` (print width 100, single quotes). That gives:
  - the selector on its own line, then **one declaration per line**, indented 2 spaces, then `}` on its own line;
  - long value lists (`transition`, `box-shadow`, `grid-template-areas`, ...) split one item per line;
  - nested blocks (`@media`, `@keyframes`, `&:hover`) indented one more level;
  - quoted attribute selector values (`[dir='rtl']`).
- **One blank line between top-level rules**; no blank lines inside a rule. A comment stays directly above the rule it describes.
- **Never** a whole rule on one line, and never two declarations on one line (`.mt .x { a: 1; b: 2; }` is not allowed).
- **Pure formatting:** don't change selectors, their order, values, units or nesting while formatting. The compiled CSS must stay the same (only whitespace inside custom-property values may differ). Moving rules under `.mt { }` or merging selectors is a refactor, not formatting, so don't do it as part of this rule.
- **How:** run `npm run format:scss` in `App-WebUI` (all files) or `npm run format:scss -- <file>` (one file). The script (`scripts/format-scss.mjs`) runs Prettier, adds the blank lines, compiles each file with Sass before and after, and **refuses to write a file whose compiled CSS would change**.
- **Before finishing** any change that adds or edits SCSS, run `npm run format:scss -- --check`. It must print `All SCSS files are formatted.`

Example:

Wrong:
```scss
.mt .tc { position: relative; display: grid; gap: 12px; transition: transform 0.2s var(--k-ease), border-color 0.2s, opacity 0.3s; }
.mt[dir=rtl] .tc::before { border-radius: 4px 0 0 4px; }
```

Right:
```scss
.mt .tc {
  position: relative;
  display: grid;
  gap: 12px;
  transition:
    transform 0.2s var(--k-ease),
    border-color 0.2s,
    opacity 0.3s;
}

.mt[dir='rtl'] .tc::before {
  border-radius: 4px 0 0 4px;
}
```

Reference: App-WebUI\src\app\pages\tasks\ui\task-card\task-card.scss, App-WebUI\scripts\format-scss.mjs
