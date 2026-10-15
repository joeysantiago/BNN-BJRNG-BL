Move models out of service and component files into dedicated model files in
the specified scope (or the whole of `App-WebUI` if none is given).

Rules:
- Every `interface`, `type` alias, `enum`, and data-shape `class` declared in a
  `*.service.ts` or `*.component.ts` file (exported or not) must move to a
  `*.model.ts` file.
- Location: shared across features -> `shared/models/`; app-wide/core ->
  `core/models/`; single-feature only -> next to the feature as `<feature>.model.ts`.
- Name the model file after its service/component (`lookup.service.ts` ->
  `lookup.model.ts`) unless an existing model file already covers the concern.
- Export every moved declaration, and update all imports across the solution to
  point at the model file. Do not re-export models from the service/component.
- Model files contain only models — no decorators, injected dependencies, or logic.
- Do not add blank lines between properties in WebUI models (the `format-model` rule is WebAPI-only).
- Do not change property names, types, or order — relocation only.
- Do not touch FileDropper (`features/file-dropper`) unless explicitly asked.
- Verify with an Angular build (`ng build`) after moving.

See `document/model-separation.md` for the full standard.
