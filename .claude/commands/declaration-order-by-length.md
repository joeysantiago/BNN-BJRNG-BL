Order field and property declarations by character count in the specified scope (App-WebAPI and App-Database C# classes, structs and records; never interfaces or enums).

Rule (full details in App-Document/declaration-order-by-length.md):
- All field and property declarations go at the top of the type, before the constructor(s), in ONE block sorted by the character count of the whole declaration written on one line — shortest first. EXCEPT a property named `Id`: it is always the first declaration, whatever its length. Fields (const, static, instance) and properties are sorted together.
- Length = the full declaration on one line (multi-line ones joined with single spaces); attributes, XML docs and comments are not counted and travel with their declaration. Ties: alphabetical, ordinal.
- One blank line between declarations and between the block and the constructor.
- Layout: declarations, constructors, `#region Public Methods`, `#region Private Methods`, nested types.
- Primary-constructor parameters are not declarations; the rule applies to body members.
- A type whose static initializers depend on another non-const member, or whose declarations sit inside #region / #if, is left as is — tell the user.
- Pure reorder — never change a declaration. Build the affected projects afterwards.

Example:
Before: public sealed class AzureSqlServer { private static readonly TimeSpan OnlinePollInterval = ...; private static readonly TimeSpan OnlineTimeout = ...; ctor; public override string Name => "Azure SQL Server"; }
After:  Name (shortest) first, then OnlineTimeout, then OnlinePollInterval, then the constructor.

Scope: $ARGUMENTS
