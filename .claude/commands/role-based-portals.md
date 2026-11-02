Apply the role-based access rule in the specified scope (App-WebAPI and App-WebUI).

Follow `App-Document/role-based-portals.md`: every Settings page action is protected in the API with `[HasPermission(PageCodes.X, PermissionActions.Y)]`
and shown in the UI only when `auth.can(page, action)` allows it; a super admin has every right; only a super admin changes super admins, their role or its rights;
roles, pages and rights come from the database (`Roles`, `Pages`, `RolePermissions`), app access stays per user. A new page that needs rights gets a `Pages` row,
a `PageCodes` constant, a `PageCode` entry, a `perm.page.<code>` translation and `RolePermissions` rows for the built-in roles.

Scope: $ARGUMENTS
