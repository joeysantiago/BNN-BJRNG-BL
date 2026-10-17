# Declaration Ordering by Length (App-WebUI TypeScript)

Applies to every `.ts` file in `App-WebUI/src` except `*.spec.ts` and `*.d.ts`. It is the TypeScript counterpart of `declaration-order-by-length.md` (C#): the same "short to long" idea as `import-sort-by-length.md`.

## Rule

1. **Model members.** The members of every `interface` and every `type X = { … }` object type (see `model-separation.md`) form **one block sorted by the character count of the whole member, shortest first, longest last** — except that a member named `id` always comes first. Property signatures and method signatures are sorted together. No blank lines between members (the WebUI model rule).
2. **Class fields and properties.** All field and property declarations of a class (including `inject(...)`, `signal(...)`, `computed(...)`, `input(...)`, `viewChild(...)`, constants, decorated properties and arrow-function properties) go in **one block at the top of the class**, before accessors and the constructor, sorted the same way.
3. A class is laid out top to bottom as: fields/properties (shortest → longest), accessors (`get` / `set`), constructor, `// #region Public Methods`, `// #region Private Methods` (see `method-ordering-regions-ui.md` for the methods).

## Details

- **Length** = the characters of the complete declaration written on one line, from the first modifier (or the name) through the closing `;`, with no leading indentation. A declaration spanning several lines (multi-line initializer, object type, arrow function body) is measured as if joined with single spaces. Decorators (`@Input()`, `@ViewChild(...)`), JSDoc and `//` comments are **not** counted.
- **`id` is always first.** A member named exactly `id` is the first member of its interface, type or class field block, whatever its length; every other member is then sorted by length. (`playerId`, `userId` and similar are ordinary members.)
- **Ties** (same length): alphabetical by declaration text, ordinal, case-sensitive.
- **Decorators, JSDoc and comments travel with their declaration** when it moves.
- **Blank lines:** none between model members. In classes, a declaration that carries a comment keeps one blank line above its comment; all others sit on consecutive lines.
- **Construction order.** A class field initializer that reads another field while the object is being constructed (for example `private readonly cfg = PLAYERS[this.id];`) must stay **after** the field it reads. Reads inside function bodies (`computed(() => this.x())`, `effect(...)`, arrow functions) happen later and do not count. If the strict length order would put a field before one it depends on, **leave that class as it is and tell the user**.
- **Not reordered:** enum members, union members, interfaces that declare index or call signatures, object literals and `const` objects, constructor parameter properties, and anything in `*.spec.ts`.
- This is a pure reorder: never change a declaration's text, name, type or modifier to satisfy the rule.

## Example

### Don't

```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}
```

### Do

```ts
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string | null;
}
```

### Don't

```ts
export interface FeatureInfo {
  group: FeatureGroup;
  label: string;
  help: string;
  id: FeatureId;
}
```

### Do (`id` first, then by length: `help`, `label`, `group`)

```ts
export interface FeatureInfo {
  id: FeatureId;
  help: string;
  label: string;
  group: FeatureGroup;
}
```

### Don't

```ts
export class Counter {
  protected readonly label = computed(() => `Total: ${this.count()}`);
  private readonly doc = inject(DOCUMENT);
  readonly count = signal(0);
}
```

### Do

```ts
export class Counter {
  readonly count = signal(0);
  private readonly doc = inject(DOCUMENT);
  protected readonly label = computed(() => `Total: ${this.count()}`);
}
```

(`label` only reads `count` inside the `computed` function body, so it may sit anywhere.)

## Checklist when adding a field, property or model member

1. Put it in the declaration block at the top, at the position its length dictates (shortest first); an `id` always goes first.
2. Keep model members on consecutive lines.
3. Move its decorators, JSDoc and comments with it.
4. If a field initializer reads another field at construction time, keep it after that field.
5. Build (`ng build`) to confirm nothing depended on the old order.
