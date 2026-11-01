Lay out HTML/Angular template tags on one line, fill-wrapping at 250 characters, in the specified scope (every `.html` file and all new or edited HTML).

Rule (full details in App-Document/html-single-line.md):
- Put the tag name and ALL attributes/bindings on ONE line. If the line (indentation included) is 250 characters or fewer, leave it on one line.
- Only if it exceeds 250 characters, fill-wrap: put as many attributes as fit on the first line (up to 250, starting right after the tag name on the same line — never leave `<tag` alone on its line), continue on the next line indented 2 spaces deeper than the tag, again filling to 250. Closing `>` or `/>` stays on the last attribute's line.
- Never group attributes by meaning, put one attribute per line, or break early while the next attribute still fits.
- The 250 limit counts indentation and any text after the tag on the same line. Wrap only at attribute boundaries, never inside a quoted value.
- Pure whitespace change — never change attributes, bindings or content. Build with `ng build` afterwards.

Example:

Before:
<input
  id="max" type="number" min="1" step="1"
  placeholder="Max downloads" [ngModel]="maxInput()" />

After:
<input id="max" type="number" min="1" step="1" placeholder="Max downloads" [ngModel]="maxInput()" />

Scope: $ARGUMENTS
