# Role-Based Access (App-WebAPI + App-WebUI)

Thakurg has one site with one common login. What a user may see and do on the **Settings page** (`/master`) depends on their **role**. App access
(Creta, Nexon, Khata, …) stays **per user** (`UserAppAccess`); administrators (super admins and admins) open every app.

## Data (Common database, all from the database)
| Table | Holds |
|---|---|
| `Roles` | `Code`, `Name`, `Description`, `IsSystem` (built-in: code fixed, cannot be deleted), `IsDefault` (the role every self sign-up gets), `SortOrder` |
| `Users.RoleId` | the user's role (replaces the old `IsAdmin` flag) |
| `Pages` | the Settings tabs rights are given for (`settings.account`, `settings.users`, `settings.roles`, `settings.permissions`, `settings.features`, `settings.connection`, `settings.services`, `settings.youtube`, `settings.json`); `HasAdd` / `HasDelete` say whether those rights mean anything there |
| `RolePermissions` | one row per role and page: `CanView`, `CanAdd`, `CanEdit`, `CanDelete` |
| `UserFeatures` | options of their own pages a user switched off for themselves (only hides; a site-wide switch that is off stays off) |

Built-in roles: `super-admin` (every right, whatever its rows say), `admin`, `standard` (the sign-up role: only the My settings tab).

## Rules
1. **Every right is checked by the API.** Endpoints use `[HasPermission(PageCodes.X, PermissionActions.Y)]`; the UI hiding a tab or button is only a convenience.
2. **A super admin has every right.** Only a super admin may add, change or delete a super admin, give the super admin role, or change the super admin role and its rights.
3. **Nobody changes their own role or deletes themselves**, and the last super admin can neither lose the role nor be deleted.
4. **One role is the sign-up role** (`IsDefault`), never the super admin role. It moves only by marking another role.
5. **A role users still have cannot be deleted**; built-in roles cannot be deleted and keep their code.
6. Any right includes View; Add and Delete are kept only on pages where they mean something (`Pages.HasAdd` / `HasDelete`).
7. A change to a role or its rights applies to its users at once (`IAuthSessionCache.Forget`).

## Adding a new page or tab that needs rights
1. Add a row to `INSERT/Common/013_Pages.sql` and a constant to `Thakurg.Contracts/Auth/PageCodes.cs` (also add it to `PageCodes.All`).
2. Add the code to `PageCode` in `App-WebUI/src/app/core/models/role.model.ts` and a translation key `perm.page.<code>` (en, hi, ar) to the `config` row of `INSERT/Common/007_Translations.sql`.
3. Give the built-in roles their rows in `INSERT/Common/014_RolePermissions.sql`.
4. Protect the endpoints with `[HasPermission(...)]`; in the UI, show the tab or button with `auth.can(page, action)`.

## Development logins (seed `INSERT/Common/009_Users.sql`; remove before production)
| Role | E-mail | Password |
|---|---|---|
| Super Admin | superadmin@thakurg.com | Super@1234 |
| Admin | admin@thakurg.com | Admin@1234 |
| Standard User | user@thakurg.com | User@1234 |

Development builds offer them as one-tap fills on the login page (`environment.devLogins`); QA, UAT and live have none.
