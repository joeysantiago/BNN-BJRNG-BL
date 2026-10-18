Models must live in their own model file — never inside a service or a
component file.

Rules:
- Every `interface`, `type` alias, `enum`, and data-shape `class` (request/response
  DTOs, view models, option/config shapes, form definitions, etc.) must be declared
  in a dedicated `*.model.ts` file, not in a `*.service.ts` or `*.component.ts` file.
- This applies to non-exported, file-private declarations too — move them to the
  model file and export them.
- Service and component files may only contain the service/component class itself
  (plus its decorator). They import models from the model file; they must not
  re-export them.
- Model file location:
  - Used across features / by shared code -> `shared/models/<name>.model.ts`
  - Core/app-wide concerns (auth, navigation, theme, API envelopes) -> `core/models/<name>.model.ts`
  - Used by a single feature only -> next to that feature as `<feature>.model.ts`
- Name the model file after the service/component it belongs to
  (`lookup.service.ts` -> `lookup.model.ts`, `certificate-grid.component.ts` ->
  `certificate-grid.model.ts`) unless an existing model file already covers the concern.
- Model files contain only models (and the types/constants strictly tied to them);
  no Angular decorators, no injected dependencies, no logic.
- Do NOT apply `format-model.md` to WebUI models: Angular model files keep properties
  on consecutive lines with no blank line between them (that rule is WebAPI-only).
- Moving a model is a refactor only — do not change property names, types, or order.
