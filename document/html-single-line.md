# HTML Formatting Standard — Single Line, Then Fill-Wrap at 250 Characters

This document defines how HTML/Angular template elements (opening tags with attributes, bindings, directives) are laid out. It applies to **every `.html` file, and to all newly generated or edited HTML**.

## Rule

1. **Start with one line.** Put the tag name and ALL attributes/bindings on a single line. If the whole line (indentation included) is 250 characters or fewer, stop — leave it on one line.
2. **If it exceeds 250 characters, fill-wrap.** Put as many attributes as fit on the first line (up to 250 characters, indentation included), starting right after the tag name on the SAME line — never leave `<tag` alone on its own line. Then continue on the next line, indented 2 spaces deeper than the tag, again filling up to 250 characters. Repeat until done. Closing `>` or `/>` stays on the last attribute's line.
3. **Never** group attributes by meaning, put one attribute per line, or break a line early while there is still room for the next attribute within 250 characters.

## ❌ Don't (tag name alone on a line, short lines, wrapped although room was left)

```html
<input
  id="fd-security-max-downloads" type="number" min="1" step="1"
  class="fd-share-security-input fd-share-security-input--narrow"
  placeholder="Max downloads" [ngModel]="maxDownloadsInput()"
  (ngModelChange)="maxDownloadsInput.set($event)" />
```

```html
<p-password
  inputId="newPassword" formControlName="newPassword" [feedback]="false" [toggleMask]="true"
  styleClass="w-100" inputStyleClass="w-100" />
```

## ✅ Do (fits in 250 characters → single line)

```html
<p-password inputId="newPassword" formControlName="newPassword" [feedback]="false" [toggleMask]="true" styleClass="w-100" inputStyleClass="w-100" />
```

## ✅ Do (exceeds 250 characters → fill each line, continuation indented 2 deeper)

```html
<input id="fd-security-max-downloads" type="number" min="1" step="1" class="fd-share-security-input fd-share-security-input--narrow" placeholder="Max downloads"
  [ngModel]="maxDownloadsInput()" (ngModelChange)="maxDownloadsInput.set($event)" />
```

## Guidance

- The 250-character limit counts leading indentation and any text that follows the tag on the same line.
- Wrap only at attribute boundaries; never split an attribute's quoted value.
- When editing an existing HTML file, re-flow any tag you touch to this layout.
