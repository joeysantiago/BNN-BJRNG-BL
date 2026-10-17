# Method Ordering and Regions (App-WebAPI)

Applies to every C# class in `App-WebAPI` (`Thakurg`).

## Rule

1. **Public methods first, private methods last**, each group wrapped in a `#region` / `#endregion` pair so it is easy to find and collapse.
2. Inside each region, order methods by the **character count of the method's first signature line** — shortest first, longest last.
3. A class is laid out top to bottom as:
   1. `const` / `static` / instance fields
   2. Properties
   3. Constructor(s)
   4. `#region Public Methods` … `#endregion`
   5. `#region Private Methods` … `#endregion`
   6. Nested types (if any), after the regions

## Details

- **Public region** (`#region Public Methods`): every `public` method — controller actions, service/repository interface implementations, overrides that are `public`. If a class has no public methods, omit this region.
- **Private region** (`#region Private Methods`): every non-public method (`private`, `protected`, `internal`, `private protected`), static helpers included. If a class has none, omit this region.
- **Measuring "first signature line"**: take the line that declares the method (access modifier through the opening parenthesis and, if the signature is wrapped per `page-break.md`, only that first physical line). Count its characters after trimming the leading indentation. Attributes (`[HttpGet("x")]`), XML docs and `//` comments are **not** counted — they are not the signature line.
- **Ties**: if two methods have the same count, the one with fewer parameters goes first; if still equal, keep their existing relative order.
- **Comments, XML docs and attributes travel with their method** — they stay directly above it when it moves.
- **Interfaces** have no regions (all members are public); only apply the shortest-signature-first ordering.
- Fields and properties are ordered by `declaration-order-by-length.md` (one block at the top, shortest first), not by this rule; they and the constructors stay above the regions.
- This is a pure reorder: never change a method's body, signature, name or visibility to satisfy the rule.
- Formatting still follows the other standards: signatures per `signature-single-line.md` / `page-break.md`, a blank line between members, brace rule per `simplify-if.md`.

## Example

```csharp
public class CalculatorService : ICalculatorService
{
    private readonly ICalculatorRepository _repository;

    public CalculatorService(ICalculatorRepository repository)
    {
        _repository = repository;
    }

    #region Public Methods

    public int Add()
    {
        return 0;
    }

    public int Add(int num)
    {
        return num;
    }

    public int Add(int num, int num2)
    {
        return Validate(num) + Validate(num2);
    }

    #endregion

    #region Private Methods

    private int Validate(int value)
    {
        return Math.Max(value, 0);
    }

    private static int ClampToLimit(int value, int limit, int fallback)
    {
        return value > limit ? fallback : value;
    }

    #endregion
}
```

## Checklist when adding or editing a method

1. Public → inside `#region Public Methods`; non-public → inside `#region Private Methods`.
2. Insert it at the position its first signature line length dictates (shortest first).
3. Move its comments/attributes with it.
4. Build the affected project.
