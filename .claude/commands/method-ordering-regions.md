Order methods and wrap them in regions in the specified scope (App-WebAPI C# only).

Rule (full details in App-Document/method-ordering-regions.md):
- Class layout top to bottom: fields, properties, constructor(s), `#region Public Methods`, `#region Private Methods`, then nested types.
- All public methods go in `#region Public Methods ... #endregion`; all non-public methods (private/protected/internal, static helpers) go in `#region Private Methods ... #endregion`. Omit a region if the class has none of that kind.
- Inside each region, sort by the character count of the method's first signature line (trimmed of indentation; attributes, XML docs and comments are not counted; for wrapped signatures only the first physical line counts) — shortest first. Ties: fewer parameters first, then keep existing order.
- Comments, XML docs and attributes move with their method.
- Interfaces: no regions, only the shortest-signature-first ordering.
- Fields and properties are ordered by App-Document/declaration-order-by-length.md; formatting follows signature-single-line.md / page-break.md.
- Do not reorder fields, properties or constructors. Pure reorder — never change a body, signature, name or visibility.
- Build the affected API projects afterwards to confirm nothing broke.

Example:
public int Add()                         // shortest signature first
public int Add(int num)
public int Add(int num, int num2)        // longest signature last
...private helpers go in the Private Methods region below, same ordering.

Scope: $ARGUMENTS
