Scope: App-WebAPI (backend) only. Do NOT apply this to App-WebUI/Angular models,
which keep properties on consecutive lines with no blank lines between them.

Format the model/class/interface in the specified file so that there is
exactly one blank line between each property/field declaration.

Rules:
- Add a blank line after every property, including the last one before
  the closing brace only if it improves readability (skip if it's the
  final property right before `}`).
- Do not add blank lines inside method bodies — only between top-level
  property declarations.
- Do not change property order, types, or values — formatting only.
- Preserve any existing comments above a property; keep them attached
  to that property.