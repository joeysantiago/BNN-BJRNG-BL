# Import Ordering by Length (App-WebUI)

Applies to every TypeScript file in `App-WebUI` (components, services, guards, models, routes, `main.ts`, `app.config.ts`, …) except `*.spec.ts`.

## Rule

The `import` statements at the top of a file are sorted by the **character count of the whole statement, shortest first, longest last** — the same "short to long" idea used for method signatures.

```ts
import { A } from 'a';
import { Aa } from 'aa';
import { Aaa, Bbb } from 'aaa';
```

## Details

- **Length** = the number of characters of the complete import statement written on one line, from `import` through the closing `;`, with no leading indentation (a wrapped multi-line import is measured as if joined with single spaces).
- **Ties** (same length): alphabetical by module path (`from '…'`), ordinal, case-sensitive.
- **One block, no blank lines** between imports, and exactly one blank line between the block and the code that follows.
- **Side-effect imports** (`import 'zone.js';`, `import './polyfills';`) are not sorted — they keep their original relative order and stay at the very top of the block, above the sorted imports, because their order can matter.
- `import type { … }` and `import { type … }` are ordinary imports and sort by length like the rest.
- Do **not** reflow, rename, merge or remove imports to satisfy this rule — it is a pure reorder. (Unused imports are handled separately by normal cleanup.)
- A file whose import block contains comments between imports is left untouched and the comment's position is respected by sorting only the contiguous runs of imports on each side of it — if that is not clearly safe, leave the file alone.
- Long imports follow the 250-character line limit in `page-break.md`; an import wider than 250 characters keeps its existing wrapped layout but is still sorted by its joined length.

## Example

### Don't

```ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
```

### Do

```ts
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
```

## Checklist when adding an import

1. Insert it at the position its statement length dictates (shortest first).
2. Keep one block, no blank lines inside it.
3. Build / type-check the UI.
