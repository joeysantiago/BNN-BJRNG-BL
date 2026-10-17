Order methods and wrap them in regions in the specified scope (App-WebUI TypeScript classes; skip *.spec.ts).

Rule (full details in document/method-ordering-regions-ui.md):
- Class layout top to bottom: fields/properties (sorted per document/declaration-order-by-length-ui.md), accessors (get/set), constructor, `// #region Public Methods`, `// #region Private Methods` (each closed with `// #endregion`).
- Public (no modifier / `public`, incl. Angular lifecycle hooks and template handlers) go in Public Methods; `private` / `protected` / `#private` go in Private Methods. Omit a region if the class has none of that kind.
- Inside each region sort by the character count of the first signature line (trimmed indentation; decorators and comments not counted; wrapped signatures count only the first physical line) — shortest first. Ties: fewer parameters first, then keep existing order.
- Decorators, JSDoc and comments move with their method. Arrow-function properties stay with properties. Module-level functions, interfaces, types, enums are untouched.
- Pure reorder — never change a body, signature, name or visibility. Type-check / build afterwards.

Example:
add(): number            // shortest signature first
add(num: number)
addAll(num: number, num2: number)   // longest signature last
...private helpers go in the Private Methods region below, same ordering.

Scope: $ARGUMENTS
