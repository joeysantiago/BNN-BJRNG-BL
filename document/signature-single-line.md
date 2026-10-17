# Code Formatting Standard — Keep Method Signatures on One Line

This document refines `page-break.md` for method/function **declarations**. The line-length limit is **250 characters**.

## Rule

- A method/function declaration is written on **one single line** — name, all parameters, and return type — whenever the line (indentation included) is **250 characters or fewer**, regardless of how many parameters it has. Do **not** break after the opening `(`, and do **not** push the `): ReturnType {` onto its own line.
- A declaration with **4 or fewer parameters stays on one line even when it exceeds 250 characters**.
- Only a declaration with **more than 4 parameters AND more than 250 characters** wraps, and then follows `page-break.md` (group 4–5 parameters per line, each line within 250 characters).

## ❌ Don't

```typescript
getColumnPermissions(
  app: AppKey, tableConfigCode: string, roleId: number
): Observable<ApiResponse<ColumnPermission[]>> {
  ...
}
```

```csharp
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request,
    CancellationToken cancellationToken)
```

## ✅ Do

```typescript
getColumnPermissions(app: AppKey, tableConfigCode: string, roleId: number): Observable<ApiResponse<ColumnPermission[]>> {
  ...
}
```

```csharp
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
```

## Scope

- Applies to all application code (services, components, guards, controllers, repositories, etc.) .
- Declarations (methods, constructors, functions); call sites follow the call-site clause in `page-break.md`.
- After changing a signature's line layout, re-check the method order required by `method-ordering-regions.md` / `method-ordering-regions-ui.md` (they sort by the first signature line's length).
