Keep each app's SQL scripts in its own folder, with its own seeder that asks before it runs, in the specified scope (App-Database).

Rule:
- Scripts are split **per app**, not in one shared folder:
  - `App-Database\DatabaseInitializer\SqlScripts\CREATE\<App>\` for tables
  - `App-Database\DatabaseInitializer\SqlScripts\INSERT\<App>\` for seed data
- **Current apps:**

  | Folder | Holds |
  |---|---|
  | `Common` | Site-wide tables used by every page: `Messages`, `AppSettings`, `Features`, `PageNames`, `ConnectionFields`, `ServiceItems`, `Translations` |
  | `Music` | The Creta/Nexon audio players: `MusicPlayers`, `MusicTracks` |
  | `SnapKhata` | The `/khata` ledger: every `Khata*` table |
- **Folder names** are PascalCase, one word per app, matching the seeder's `Database` value.
- **Numbering restarts at `001` in every folder**, in dependency order (parents first). An INSERT file has the **same number** as the CREATE file of the table it seeds (`CREATE\SnapKhata\002_KhataCurrencies.sql` → `INSERT\SnapKhata\002_KhataCurrencies.sql`). An INSERT folder may skip numbers, because not every table has seed data.
- A table belongs to exactly **one** app folder. An app's scripts may reference `Common` tables (`Common` always runs first), but never another app's tables. Two apps that need each other's tables belong in one folder.
- **Rows an app needs in a `Common` table** (its `Messages` codes, `Features` switches, `PageNames`, `Translations` row) are added to the **existing `Common` INSERT file** of that table, inside its `VALUES` list. One seed file per table (`sql-seed-data.md`), no extra guarded batch (`sql-fresh-database.md`). The music rows in `Features` already work this way.
- **Every app folder has its own seeder** in `App-Database\DatabaseInitializer\Seeding\`:
  - The class is named `<App>DatabaseSeeder : IDatabaseSeeder`, with `Database => "<App>"` (the folder name) and `DatabaseName => "thakurg-meta"`. Copy `SnapKhataDatabaseSeeder.cs`.
  - It is registered in `Program.cs` in run order: `Common` first, then the others.
- **The initializer asks before running each app:**
  > `Create the <App> app database objects in 'thakurg-meta'? [y/N]`

  Only the confirmed apps run. All apps share one database, so the "drop and rebuild" question is asked **once**, after the app questions and before any script runs.
  - **Without a console** (scripts, CI): pass `--Apps=Common,SnapKhata` or `--Apps=All` to answer up front. Without `--Apps` and without a console, every app is skipped.
- **Adding a new app:**
  1. Create `CREATE\<App>\` and `INSERT\<App>\`, starting at `001`.
  2. Add `<App>DatabaseSeeder.cs`.
  3. Register it in `Program.cs`.
  4. Add a row to the table above.
- **Moving a table to another app** means moving its CREATE and INSERT files to that app's folder and renumbering both folders. Under `sql-fresh-database.md` there is no migration to write.
- After moving or deleting scripts, clear `bin\...\SqlScripts` (or rebuild clean). The build copies new scripts but never deletes old copies, and the runner reads the copied folder.

Example:

Wrong:  `SqlScripts\CREATE\Common\010_KhataUsers.sql`, so SnapKhata tables are mixed into the site-wide folder and numbered after `009_Translations.sql`.
Right:  `SqlScripts\CREATE\SnapKhata\001_KhataUsers.sql`, run by `SnapKhataDatabaseSeeder` and only after "Create the SnapKhata app database objects?" is answered `y`.

Reference: App-Database\DatabaseInitializer\Seeding\SnapKhataDatabaseSeeder.cs, App-Database\DatabaseInitializer\Seeding\DatabaseSeedingOrchestrator.cs
