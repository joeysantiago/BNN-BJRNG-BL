# CLAUDE.md — Coding Instructions

Follow these rules whenever writing or modifying code in this repo. They are consolidated from `.claude/commands/*`. Scope tags: **WebAPI** = `App-WebAPI` (backend, C#), **WebUI** = `App-WebUI` (Angular/TypeScript).

**Global exclusions:** never touch FileDropper (`features/file-dropper`) unless explicitly asked. Skip `*.spec.ts` for UI ordering/import rules.
**Global principle:** formatting/refactor rules are *pure* changes — never alter names, types, logic, values or behaviour. Build / type-check afterwards (`ng build` for UI, build the API projects for backend).

---

## 1. Single-statement `if` (all code)
- An `if` whose body is exactly one statement: drop the braces, put the statement on the next line, indented. Never on the same line as the `if`.
- Does NOT apply if there is an `else` / `else if`, or the body has more than one statement — keep braces there.
- Preserve the condition exactly.

```
if (response)
    return null;
```

## 2. Model property formatting (WebAPI only)
- Exactly one blank line between each property/field declaration in a model/class/interface.
- Skip the blank line after the final property right before `}`.
- No blank lines inside method bodies.
- Don't change order, types or values. Comments stay attached to their property.
- **WebUI models do NOT get blank lines** — properties stay on consecutive lines.

## 3. Method / function signatures on one line (WebAPI + WebUI)
- Name, all parameters and return type stay on ONE line when the line (indentation included) is ≤ 250 characters, any number of parameters.
- Don't break after the opening `(`; don't move `): ReturnType {` to its own line.
- ≤ 4 parameters stays on one line even beyond 250 characters.
- Only > 4 parameters AND > 250 chars wraps: 4–5 parameters per line (never one per line), each line ≤ 250.
- Calls follow the same limit only if the args contain no lambdas/function bodies, initializers, comments or nested multi-line expressions.
- HTML templates keep their own 250 limit (`html-single-line.md`).
- Details: `document/signature-single-line.md`, `document/page-break.md`.
- After changing signatures, re-check method ordering (§5).

```
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
```

## 4. Import ordering (WebUI TypeScript; skip `*.spec.ts`)
- Sort the top-of-file import block by character count of the whole statement written on one line (`import` … `;`; wrapped imports measured joined with single spaces) — shortest first, longest last.
- Ties: alphabetical by module path (ordinal).
- One block, no blank lines inside, one blank line after.
- Side-effect imports (`import 'x';`) keep original order and stay at the top.
- Pure reorder — never rename, merge, remove or reflow. Leave the file alone if comments inside the block make the reorder unclear.
- Details: `document/import-sort-by-length.md`.

```
import { A } from 'a';
import { Aa } from 'aa';
import { Aaa, Bbb } from 'aaa';
```

## 5. Method ordering and regions (WebUI TypeScript classes; skip `*.spec.ts`)
- Class layout top to bottom: fields/properties, accessors (get/set), constructor, `// #region Public Methods`, `// #region Private Methods` (each closed with `// #endregion`).
- Public (no modifier / `public`, incl. Angular lifecycle hooks and template handlers) → Public Methods. `private` / `protected` / `#private` → Private Methods. Omit a region if empty.
- Within each region sort by character count of the first signature line (trimmed indentation; decorators and comments not counted; wrapped signatures count only the first physical line) — shortest first. Ties: fewer parameters first, then keep existing order.
- Decorators, JSDoc and comments move with their method. Arrow-function properties stay with properties. Module-level functions, interfaces, types, enums untouched.
- Details: `document/method-ordering-regions-ui.md`.

```
add(): number                          // shortest first
add(num: number)
addAll(num: number, num2: number)      // longest last
```

## 6. Model separation (WebUI)
- Every `interface`, `type`, `enum` and data-shape `class` declared in a `*.service.ts` or `*.component.ts` (exported or not) must live in a `*.model.ts` file.
- Location: shared across features → `shared/models/`; app-wide/core → `core/models/`; single-feature → next to the feature as `<feature>.model.ts`.
- Name the model file after its service/component (`lookup.service.ts` → `lookup.model.ts`) unless an existing model file already covers the concern.
- Export every moved declaration; update all imports solution-wide. Do not re-export models from the service/component.
- Model files contain only models — no decorators, injected dependencies or logic.
- No blank lines between properties in WebUI models.
- Relocation only — don't change property names, types or order.
- Details: `document/model-separation.md`.

## 7. Messages — single source (WebAPI Generic/HRMS/IMS and WebUI)
- No message text typed in code. Texts live in the Messages table (`Code`, `Texts` = one JSON object with every language), edited via Settings → Configurations → Resource Management.
- **API:** `throw new BusinessException(MessageCodes.X, status, args)`; success text via `await _messageService.GetAsync(MessageCodes.X)` (`ISettingsServices.Messages`), returned by the controller in `SuccessResponse`. No sentences in controllers/services. Use placeholders `{0}`, `{1}` — no string interpolation.
- **UI:** toasts/inline errors use `MessageTextService.get(UiMessageCodes.X, ...args)`; API messages arrive translated in the response and are shown as-is.
- Every new code = a constant (`MessageCodes.*.cs` / `HrmsMessageCodes` / `ImsMessageCodes` / `UiMessageCodes`) **plus** an English row in the Messages seed script.
- Keep English wording/behaviour identical.
- Details: `document/messages-single-source.md`.

## 8. SEO and indexing — REQUIRED on every page (mobile and web)
The target is 100% SEO coverage and fully indexable pages on mobile and desktop. Every new or changed page/route/section must meet all of this before it is considered done:
- **Prerendered HTML:** each real page is in `app.routes.server.ts` as `RenderMode.Prerender` and in the `pages` list of `scripts/postbuild.mjs`, so crawlers get full content without running JS. Browser-only data (IP, status fetches) loads after render (`afterNextRender`) and must not be the only place important text lives.
- **Per-page metadata** through `SeoService.set(...)`: unique title, meta description, canonical URL (trailing slash), Open Graph + Twitter tags, share image in `public/og/`, and `hreflang` alternates for multi-language pages. All text from i18n keys (`seo.<page>.title/desc`) in en, hi and ar.
- **Structured data (JSON-LD)** where it fits (WebApplication, FAQPage, etc.). Must be valid.
- **Sitemap and robots:** add every indexable page to the sitemap entries in `scripts/postbuild.mjs`; never `noindex` a real page; unknown URLs stay 404.
- **Mobile-first:** correct viewport meta, layout works at 320 px, tap targets ≥ 44 px, no horizontal scroll, readable text without zoom. Core Web Vitals matter: no layout shift (reserve space for async content), lazy-load non-critical code, no blocking third-party scripts.
- **Semantics and accessibility:** one `<h1>` per page, ordered headings, landmarks, `lang`/`dir` set per language (Arabic is RTL), alt text / `aria-label`s, descriptive link text, sufficient contrast in all four skins.
- **Verify before finishing:** run `npm run build` (postbuild fails if a page is missing), open the built HTML for the page and confirm title, description, canonical, h1 and content are present with JS disabled, and check the mobile layout. State plainly anything that could not be verified (for example live indexing in Google Search Console) — do not claim "100% indexed" without proof.

---

## Pre-finish checklist
1. Single-statement `if` braces removed (no else, one statement).
2. Signatures on one line (≤ 250 chars; wrap rules only for > 4 params).
3. UI imports sorted by length; class methods in Public/Private regions sorted by signature length.
4. Models in `*.model.ts`; WebAPI model properties blank-line separated, WebUI not.
5. No hardcoded message text; codes + seed rows added.
6. SEO/indexing rules in §8 met on mobile and web (prerendered, metadata, sitemap, JSON-LD, hreflang).
7. FileDropper untouched; build / type-check passes.
