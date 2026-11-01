Write database changes straight into the CREATE and INSERT scripts in the specified scope; never write ALTER or migration scripts while the app is pre-production (App-Database).

Rule:
- Until production starts, the database is created **fresh** every time: the owner drops it and runs `DatabaseInitializer` again. No existing data has to be kept, so there is nothing to migrate.
- A new or changed column goes **directly** into the table's own `CREATE` script (`SqlScripts/CREATE/<App>/<NNN>_<Table>.sql`, see `sql-app-folders.md`), in the aligned grid (`sql-table-format.md`). Never add an `ALTER TABLE ... ADD/ALTER/DROP COLUMN` script, and never add an `IF COL_LENGTH(...) IS NULL` guard for a column.
- A new or changed seed row goes **directly** into the existing `VALUES` list of the table's `INSERT` script (`sql-seed-data.md`), in its natural place and order. Never append a second guarded batch (`IF NOT EXISTS (SELECT 1 FROM X WHERE Code = ...)`) to reach an already-seeded database.
- A new table gets a new CREATE script numbered in dependency order (parents first).
- Foreign keys are declared **inside `CREATE TABLE`** as table-level constraints: after the primary key, before any `CHECK`s, one per line, named `FK_<Table>_<RefTable>_<Column>`. No `ALTER TABLE ... ADD CONSTRAINT FK_...` for them.
- **The only exception is a circular reference,** where an earlier table points at a table that is created later (e.g. `KhataUsers.LastBookId` → `KhataBooks`). The earlier table can't reference a table that doesn't exist yet. That one foreign key is added with `ALTER TABLE <EarlierTable> ADD CONSTRAINT ...` **inside the `IF NOT EXISTS` block of the later table**, with a one-line `-- Circular reference: ...` comment above it. No separate guarded FK batch.
- Renames, type changes and removals are made in place in the CREATE script, and every place that uses the name (seed scripts, EF entities, queries) is updated in the same change.
- Scripts stay re-runnable on a fresh database (`IF NOT EXISTS` around each CREATE, the existing empty-table guard around each seed).
- When production starts, this rule is replaced by a migration rule. From then on, changes **are** written as new, versioned ALTER scripts, because live data must be kept.

Example:

Wrong:  add `SnapKhata/021_KhataUsers_AddTimeZone.sql` with `ALTER TABLE KhataUsers ADD TimeZone VARCHAR(50) NULL`.
Right:  add the `TimeZone` row to the grid in `SnapKhata/001_KhataUsers.sql`.

Wrong:  append `IF NOT EXISTS (SELECT 1 FROM Features WHERE Code = 'page.khata') ... INSERT ...` at the end of `003_Features.sql`.
Right:  add `('page.khata', 1, 39)` to the existing `VALUES` list in `Common/003_Features.sql`.

Wrong:  `ALTER TABLE KhataBooks ADD CONSTRAINT FK_KhataBooks_KhataUsers_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES KhataUsers (Id);` after `CREATE TABLE KhataBooks`.
Right:  `CONSTRAINT FK_KhataBooks_KhataUsers_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES KhataUsers (Id)` inside `CREATE TABLE KhataBooks`, after the primary key.

Reference: App-Database\DatabaseInitializer\SqlScripts\CREATE\SnapKhata\003_KhataBooks.sql
