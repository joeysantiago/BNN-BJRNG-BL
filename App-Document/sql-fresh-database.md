Write database changes straight into the CREATE and INSERT scripts in the specified scope; never write ALTER or migration scripts while the app is pre-production (App-Database).

Rule:
- Until production starts, the database is created **fresh** every time: the owner drops it and runs `DatabaseInitializer` again. No existing data has to be kept, so there is nothing to migrate.
- A new or changed column goes **directly** into the table's own `CREATE` script (`SqlScripts/CREATE/Common/<NNN>_<Table>.sql`), in the aligned grid (`sql-table-format.md`). Never add an `ALTER TABLE ... ADD/ALTER/DROP COLUMN` script, and never add an `IF COL_LENGTH(...) IS NULL` guard for a column.
- A new or changed seed row goes **directly** into the existing `VALUES` list of the table's `INSERT` script (`sql-seed-data.md`), in its natural place and order. Never append a second guarded batch (`IF NOT EXISTS (SELECT 1 FROM X WHERE Code = ...)`) to reach an already-seeded database.
- A new table gets a new CREATE script numbered in dependency order (parents first).
- Foreign keys stay as they are written today: `ALTER TABLE <Table> ADD CONSTRAINT FK_... FOREIGN KEY ...` **inside** the table's `IF NOT EXISTS` block. That is part of the table definition, not a change script. If two tables point at each other, the foreign key is added inside the block of the table that is created **second**. No separate guarded FK batch.
- Renames, type changes and removals are made in place in the CREATE script, and every place that uses the name (seed scripts, EF entities, queries) is updated in the same change.
- Scripts stay re-runnable on a fresh database (`IF NOT EXISTS` around each CREATE, the existing empty-table guard around each seed).
- When production starts, this rule is replaced by a migration rule. From then on, changes **are** written as new, versioned ALTER scripts, because live data must be kept.

Example:

Wrong:  add `013_KhataUsers_AddTimeZone.sql` with `ALTER TABLE KhataUsers ADD TimeZone VARCHAR(50) NULL`.
Right:  add the `TimeZone` row to the grid in `010_KhataUsers.sql`.

Wrong:  append `IF NOT EXISTS (SELECT 1 FROM Features WHERE Code = 'page.khata') ... INSERT ...` at the end of `003_Features.sql`.
Right:  add `('page.khata', 1, 39)` to the existing `VALUES` list in `003_Features.sql`.

Reference: App-Database\DatabaseInitializer\SqlScripts\CREATE\Common\012_KhataBooks.sql
