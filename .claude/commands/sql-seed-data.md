Seed data into existing tables with one INSERT script per table.

Rule:
- Every table gets its own seed file under `App-Database\DatabaseInitializer\SqlScripts\INSERT\<App>\`, the folder of the app the table belongs to (`Common`, `Music`, `SnapKhata`; see `sql-app-folders.md`). A file seeds exactly one table.
- Never seed more than one table in a single file. Example: `MusicPlayers` seed data goes in the MusicPlayers file only — it must not also seed `MusicTracks`. MusicPlayers and MusicTracks each get their own separate file.
- Name the file `<NNN>_<TableName>.sql`, where `<TableName>` is the table it seeds (e.g. `Music\001_MusicPlayers.sql`, `Music\002_MusicTracks.sql`, `Common\007_Translations.sql`). `<NNN>` is the same number as the table's CREATE script in that app folder.
- Order the numeric prefix so that parent tables run before child tables that reference them (MusicPlayers before MusicTracks).
- A child file may look up its parent's Id by a natural key (e.g. player code), but it must not insert rows into the parent.
- Related rows that need new tables or columns belong in the CREATE scripts, not in the seed file.
- If a change touches several tables (e.g. new Features, PageNames, ConnectionFields), create one file per table, numbered in dependency order.
- Keep each seed script re-runnable (guard with `IF NOT EXISTS` / `WHERE NOT EXISTS`), like the existing INSERT scripts.

Example:

Wrong:  `Music\001_MusicPlayersAndTracks.sql` inserts into MusicPlayers and MusicTracks.
Right:  `Music\001_MusicPlayers.sql` inserts only into MusicPlayers; `Music\002_MusicTracks.sql` inserts only into MusicTracks.
