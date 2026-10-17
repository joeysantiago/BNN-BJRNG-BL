Order field/property declarations and model members by character count in the specified scope (App-WebUI TypeScript; skip *.spec.ts and *.d.ts).

Rule (full details in document/declaration-order-by-length-ui.md):
- Members of every `interface` and `type X = { ... }` (models): one block, sorted by the character count of the whole member written on one line — shortest first. Property and method signatures sorted together. No blank lines between members. EXCEPT a member named `id`: it is always first, whatever its length.
- Class fields/properties (inject, signal, computed, input, viewChild, constants, decorated and arrow-function properties): one block at the top of the class, before accessors and the constructor, sorted the same way.
- A decorated class has exactly ONE blank line between its last decorator and the `export class Foo {` line (after the closing `})` of @Component, or after @Injectable(...)); the first member follows the `export class` line directly, with no blank line.
- Length = the full declaration on one line (multi-line ones joined with single spaces); decorators, JSDoc and comments are not counted and travel with their declaration. Ties: alphabetical, ordinal.
- Construction order: a field whose initializer reads another field outside a function body (e.g. `PLAYERS[this.id]`) must stay after it; if length order would break that, leave the class as is and tell the user. Reads inside computed/effect/arrow bodies do not count.
- Not reordered: enums, unions, interfaces with index/call signatures, object literals, constructor parameter properties.
- Pure reorder — never change a declaration. Build with `ng build` afterwards.

Example:
Before: interface ApiResponse<T> { success: boolean; message: string | null; data: T; }
After:  interface ApiResponse<T> { data: T; success: boolean; message: string | null; }
Before: interface FeatureInfo { group: FeatureGroup; label: string; help: string; id: FeatureId; }
After:  interface FeatureInfo { id: FeatureId; help: string; label: string; group: FeatureGroup; }   // id first, then by length

Scope: $ARGUMENTS
