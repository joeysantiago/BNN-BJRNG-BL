Use INT for every table Id and every foreign key in the specified scope; never BIGINT or UNIQUEIDENTIFIER (App-Database, App-WebAPI).

Rule:
- Every table's primary key is `Id INT IDENTITY(1,1) NOT NULL` with `CONSTRAINT PK_<Table> PRIMARY KEY CLUSTERED (Id)`. The EF entity property is `public int Id { get; set; }`.
- Every foreign key column (`<Name>Id`, e.g. `UserId`, `BookId`, `OwnerUserId`, `TargetId`) is `INT` (`NULL` or `NOT NULL` as needed), and `int` / `int?` in C#.
- Do not use `BIGINT` for Ids, not even for log or history tables. INT goes up to about 2.1 billion rows, which is far more than this app needs.
- Do not use `UNIQUEIDENTIFIER` (GUID) for Ids. Reasons:
  - Security comes from **ownership checks**: every query is filtered by the logged-in user, and someone else's Id returns 404. It doesn't come from Ids being hard to guess.
  - Duplicate creates are prevented by idempotency keys, not by client-generated Ids.
  - INT is 4 bytes instead of 16: smaller indexes, faster joins, rows stored in insert order, and it matches every existing table.
- **Not covered by this rule:** values that are not row Ids and must be random or external. Examples: an idempotency key the browser generates (`UNIQUEIDENTIFIER`), token/OTP/PIN hashes (`CHAR(64)`), Google subject Ids and Drive file Ids (`VARCHAR`). These keep the type that fits the value.
- Money and sizes are not Ids either: amounts in the smallest currency unit stay `BIGINT` (e.g. `AmountMinor`, `BalanceMinor`), and file sizes stay `BIGINT` (`SizeBytes`).

Example:

Wrong:  `Id UNIQUEIDENTIFIER NOT NULL`, `Id BIGINT IDENTITY(1,1) NOT NULL`, `BookId UNIQUEIDENTIFIER NOT NULL`
Right:  `Id INT IDENTITY(1,1) NOT NULL`, `BookId INT NOT NULL`

Reference: App-Database\DatabaseInitializer\SqlScripts\CREATE\Common\008_MusicTracks.sql
