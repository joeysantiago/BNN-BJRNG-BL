Format SQL `CREATE TABLE` column definitions in the specified scope (or in any newly created table script) as an aligned grid.

Rule:
- Each column definition is split into aligned "cells", padded with spaces so that every cell starts at the same character position on every row:
  1. Column name
  2. Data type (e.g. `INT IDENTITY(1,1)`, `NVARCHAR(100)`, `BIT`, `DATETIME2`)
  3. Nullability (`NOT NULL` / `NULL`)
  4. Optional inline `CONSTRAINT ... DEFAULT (...)`
- The column-name cell is as wide as the longest column name, plus one space.
- The data-type cell is as wide as the longest data type, plus one space.
- `NULL` and `NOT NULL` start in the same column, so `NULL` is padded to line up with what follows `NOT NULL`.
- The trailing comma goes in one single column, at the far right, just after the longest row. Shorter rows are padded with spaces so their comma lines up with it — the comma sits directly after the last token of the longest row, with no space before it.
- Every column row ends with the aligned comma, including the last column when a table-level constraint (e.g. `PRIMARY KEY`) follows. Without a table-level constraint, the last column has no comma.
- Table-level constraints go after one blank line and are not part of the grid.
- Use 4-space indentation (no tabs). Keep `CREATE TABLE`, `(`, `)` on their own lines.
- Do not change names, types, nullability, or defaults — only whitespace.

Example:

Before:
CREATE TABLE Sample
(
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Sample_IsActive DEFAULT (1),
    CreatedOn DATETIME2 NOT NULL CONSTRAINT DF_Sample_CreatedOn DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Sample PRIMARY KEY CLUSTERED (Id)
);

After:
CREATE TABLE Sample
(
    Id        INT IDENTITY(1,1) NOT NULL                                                          ,
    Name      NVARCHAR(100)     NOT NULL                                                          ,
    Notes     NVARCHAR(MAX)     NULL                                                              ,
    IsActive  BIT               NOT NULL CONSTRAINT DF_Sample_IsActive DEFAULT (1)                ,
    CreatedOn DATETIME2         NOT NULL CONSTRAINT DF_Sample_CreatedOn DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Sample PRIMARY KEY CLUSTERED (Id)
);

Reference: App-Database\DatabaseInitializer\SqlScripts\CREATE\Common\008_MusicTracks.sql
