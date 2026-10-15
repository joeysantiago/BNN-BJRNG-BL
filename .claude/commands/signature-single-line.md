Put method/function/constructor declarations on one single line when they fit within 250 characters, in the specified scope.

Rule (full details in document/signature-single-line.md and document/page-break.md):
- Name, all parameters and return type stay on ONE line whenever the line (indentation included) is 250 characters or fewer — any number of parameters.
- Do not break after the opening `(` and do not move `): ReturnType {` to its own line.
- A declaration with 4 or fewer parameters stays on one line even beyond 250 characters.
- Only a declaration with more than 4 parameters AND more than 250 characters wraps: group 4–5 parameters per line (never one per line), each line within 250 characters.
- Calls follow the same limit only when the argument list has no lambda/function bodies, initializers, comments or nested multi-line expressions.
- HTML templates keep their own 250 limit (html-single-line.md).
- Do not change names, types or logic — only whitespace/line breaks. Do not touch FileDropper. Afterwards re-check method ordering (method-ordering-regions*.md sort by first-signature-line length) and build.

Example:

Before:
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request,
    CancellationToken cancellationToken)

After:
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)

Scope: $ARGUMENTS
