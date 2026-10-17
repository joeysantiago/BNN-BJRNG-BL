# Method Ordering and Regions (App-WebUI)

Applies to every TypeScript **class** in `App-WebUI` (components, services, guards-as-classes, utilities, anything declared with `class`) except `*.spec.ts` files. It is the UI counterpart of `document/method-ordering-regions.md` (App-WebAPI) and follows the same idea.

## Rule

1. **Public methods first, private methods last**, each group wrapped in a `// #region` / `// #endregion` pair so it is easy to find and collapse.
2. Inside each region, order methods by the **character count of the method's first signature line** — shortest first, longest last.
3. A class is laid out top to bottom as:
   1. Fields / properties (including `signal(...)`, `computed(...)`, `@Input()`, `@Output()`, `@ViewChild()`, constants)
   2. Accessors (`get` / `set`)
   3. Constructor
   4. `// #region Public Methods` … `// #endregion`
   5. `// #region Private Methods` … `// #endregion`

## Details

- **Public region** (`// #region Public Methods`): every method with no modifier or `public` — including Angular lifecycle hooks (`ngOnInit`, `ngOnDestroy`, …), event handlers called from templates, and interface implementations. Omit the region if the class has none.
- **Private region** (`// #region Private Methods`): every `private`, `protected` and `#private` method. Omit the region if the class has none.
- **Measuring "first signature line"**: take the physical line that declares the method (modifiers, `async`, name, parameters and return type up to the end of that line; if the signature is wrapped per `page-break.md`, only that first line counts). Count its characters after trimming the leading indentation. Decorators (`@HostListener(...)`), JSDoc/`//` comments are **not** counted.
- **Ties**: fewer parameters first; if still equal, keep the existing relative order.
- **Decorators, JSDoc and comments travel with their method** — they stay directly above it when it moves.
- Fields, properties, accessors and the constructor are **not** sorted by this rule; they stay above the regions in their current relative order.
- Arrow-function class properties (`handler = () => {...}`) are properties, not methods — they stay in the properties block.
- Module-level functions/constants outside a class, interfaces, types and enums are not affected.
- Pure reorder: never change a method's body, signature, name or visibility to satisfy the rule.
- Formatting still follows the other standards: `signature-single-line.md`, `page-break.md`, `simplify-if.md`, a blank line between members.

## Example

```ts
export class CalculatorService {
  readonly total = signal(0);

  constructor(private readonly repository: CalculatorRepository) {
  }

  // #region Public Methods

  add(): number {
    return 0;
  }

  add(num: number): number {
    return num;
  }

  addAll(num: number, num2: number): number {
    return this.validate(num) + this.validate(num2);
  }

  // #endregion

  // #region Private Methods

  private validate(value: number): number {
    return Math.max(value, 0);
  }

  private clamp(value: number, limit: number, fallback: number): number {
    return value > limit ? fallback : value;
  }

  // #endregion
}
```

## Checklist when adding or editing a method

1. Public → inside `// #region Public Methods`; `private`/`protected` → inside `// #region Private Methods`.
2. Insert it where its first signature line length dictates (shortest first).
3. Move its decorators and comments with it.
4. Type-check / build the UI.
