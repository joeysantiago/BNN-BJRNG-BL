# Component File Separation Standard (App-WebUI)

Every Angular component must keep its template and styles in their own files — never inline inside
the `.ts` file. This keeps markup/CSS out of TypeScript so it can't turn into string-built,
dynamically-assembled markup, and keeps templates/styles reviewable and lintable as HTML/SCSS rather
than as JS string literals.

## Rule

- A component's `@Component` decorator must use `templateUrl` + `styleUrl` (or `styleUrls` for more
  than one stylesheet), pointing at sibling `.component.html` and `.component.scss`/`.component.css`
  files.
- Never use the inline `template: `...`` or `styles: [`...`]` / `styles: `...`` decorator properties
  - not even for a trivial one-line template.
- Every component gets its own `.html` file and its own `.scss`/`.css` file, named to match the
  component (`foo.component.ts` / `foo.component.html` / `foo.component.scss`), even if the styles
  file starts out empty.
- This applies to every component in `App-WebUI` - feature components, shared components, and
  standalone components alike. No exceptions for "small" or "one-off" components.

## ❌ Don't

```ts
@Component({
  selector: 'app-loading',
  standalone: true,
  template: `<div class="spinner">Loading...</div>`,
  styles: [`.spinner { text-align: center; }`]
})
export class LoadingComponent {
}
```

## ✅ Do

```ts
@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss'
})
export class LoadingComponent {
}
```

`loading.component.html`:
```html
<div class="spinner">Loading...</div>
```

`loading.component.scss`:
```scss
.spinner {
  text-align: center;
}
```

## Why

- Keeps `.ts` files limited to component logic — no markup/CSS string literals to hand-build or
  interpolate at runtime, which is exactly the kind of "dynamic coding" this restricts.
- HTML/SCSS get real syntax highlighting, linting, and formatting as HTML/SCSS, not as JS template
  strings.
- Matches the rest of the codebase's components (e.g. `speedtest`, `youtube`, `creta`, `config`,
  `site-header`), which already split into `.ts`/`.html`/`.scss`.
