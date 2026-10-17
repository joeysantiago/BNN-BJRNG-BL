# Declaration Ordering by Length (C#)

Applies to every C# class, struct and record in `App-WebAPI` (`Thakurg`) and `App-Database`. Auto-generated code (`Migrations`, `*.Designer.cs`, `*ModelSnapshot.cs`, `bin`, `obj`) is excluded. Interfaces and enums are not reordered.

## Rule

1. **All field and property declarations go at the top of the type, before the constructor(s).** Nothing else (constructor, method, nested type) may sit above or between them.
2. The declarations form **one block sorted by the character count of the whole declaration, shortest first, longest last** — the same "short to long" idea as `import-sort-by-length.md`. Fields (`const`, `static`, instance) and properties (including `override`, expression-bodied and auto-properties) are sorted **together**, not in separate groups.
3. A type is laid out top to bottom as:
   1. Field and property declarations (shortest → longest)
   2. Constructor(s)
   3. `#region Public Methods` … `#endregion`
   4. `#region Private Methods` … `#endregion` (see `method-ordering-regions.md`)
   5. Nested types (if any)

## Details

- **Length** = the characters of the complete declaration written on one line, from the first modifier through the closing `;` / `}`, with no leading indentation. A declaration spanning several lines (initializer, accessor bodies) is measured as if joined with single spaces. Attributes (`[Required]`), XML docs and `//` comments are **not** counted.
- **Ties** (same length): alphabetical by declaration text, ordinal, case-sensitive.
- **Attributes, XML docs and comments travel with their declaration** when it moves.
- **One blank line between declarations**, and one blank line between the declaration block and the constructor (matches `format-model.md`).
- **Static initialization order**: a field/property whose initializer refers to another non-`const` field/property of the same type must not be reordered (C# runs static initializers in textual order). Leave such a type as it is and tell the user.
- A type whose declarations sit inside `#region` / `#if` blocks is left untouched and reported.
- Primary-constructor parameters are not declarations; the rule applies to the members in the body.
- This is a pure reorder: never change a declaration's text, name, type or visibility to satisfy the rule.

## Example

### Don't

```csharp
public sealed class AzureSqlServer : SqlServerProvisionerBase, IAzureSqlServer
{
    private static readonly TimeSpan OnlinePollInterval = TimeSpan.FromSeconds(2);

    private static readonly TimeSpan OnlineTimeout = TimeSpan.FromMinutes(5);

    public AzureSqlServer(ILogger<AzureSqlServer> logger) : base(logger)
    {
    }

    public override string Name => "Azure SQL Server";

    protected override string ConnectionStringKey => "AzureSQLConnection";
}
```

### Do

```csharp
public sealed class AzureSqlServer : SqlServerProvisionerBase, IAzureSqlServer
{
    public override string Name => "Azure SQL Server";

    protected override string ConnectionStringKey => "AzureSQLConnection";

    private static readonly TimeSpan OnlineTimeout = TimeSpan.FromMinutes(5);

    private static readonly TimeSpan OnlinePollInterval = TimeSpan.FromSeconds(2);

    public AzureSqlServer(ILogger<AzureSqlServer> logger) : base(logger)
    {
    }
}
```

## Checklist when adding a field or property

1. Put it in the declaration block at the top, at the position its length dictates (shortest first).
2. Keep one blank line between declarations and before the constructor.
3. Move its attributes/comments with it.
4. Build the affected project.
