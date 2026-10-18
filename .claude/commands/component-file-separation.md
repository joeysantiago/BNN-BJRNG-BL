Keep every Angular component's template and styles in their own files in the specified scope (App-WebUI).

Rule (full details in App-Document/component-file-separation.md):
- The `@Component` decorator uses `templateUrl` + `styleUrl` (or `styleUrls` for several stylesheets) pointing at sibling `.html` and `.scss`/`.css` files.
- Never use inline `template: ...` or `styles: ...` — not even for a trivial one-line template.
- Every component gets its own `.html` and `.scss`/`.css` file named after the component (`foo.component.ts` / `foo.component.html` / `foo.component.scss`), even if the styles file starts empty. No exceptions for small or one-off components.
- Moving markup/styles out is a pure relocation — never change the markup, selectors or behaviour. Build with `ng build` afterwards.

Example:

Before:
@Component({ selector: 'app-loading', standalone: true, template: `<div class="spinner">Loading...</div>`, styles: [`.spinner { text-align: center; }`] })

After:
@Component({ selector: 'app-loading', standalone: true, templateUrl: './loading.component.html', styleUrl: './loading.component.scss' })
loading.component.html -> <div class="spinner">Loading...</div>
loading.component.scss -> .spinner { text-align: center; }

Scope: $ARGUMENTS
