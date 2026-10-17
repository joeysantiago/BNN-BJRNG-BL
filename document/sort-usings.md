# Sort Usings and Remove Unused Namespaces (App-WebAPI)

Applies to every C# file in `App-WebAPI` (`Thakurg`) and `App-Database`.

## Rule

1. **Remove every unused `using`.** A `using` that nothing in the file references must not be in the import section.
2. **Sort the remaining `using` directives** in one single block at the top of the file:
   1. `System` and `System.*` namespaces first, alphabetical.
   2. All other namespaces after them, alphabetical (ordinal, case-sensitive: `Microsoft.…` before `Thakurg.…` before `YoutubeExplode.…`).
3. **One block, no blank lines** between `using` directives, and exactly one blank line between the block and the `namespace` declaration.
4. Special forms keep their place after the normal `using` block, each group sorted alphabetically: `using static …;` first, then `using Alias = …;`. `global using` directives (if any) stay in their own block above everything else, same sorting.
5. Never remove a `using` that is needed for an extension method, attribute, `nameof`, XML-doc `cref`, or implicit use (LINQ, EF Core extensions, DI extensions) — only remove it when the build confirms nothing needs it.
6. Pure cleanup: never change code to satisfy this rule.

## Example

### Don't

```csharp
using Microsoft.EntityFrameworkCore;
using Thakurg.Contracts.Wrappers;
using System.Text.Json;

using Thakurg.Application.Services;
using System.Globalization;
using Thakurg.Application.Common;   // unused

namespace Thakurg.API.Controllers;
```

### Do

```csharp
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Services;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;
```

## Checklist when adding or editing a file

1. Add the `using` you need into its sorted position (`System.*` first).
2. Delete any `using` you no longer reference.
3. Build the affected project to confirm nothing depended on a removed `using`.
