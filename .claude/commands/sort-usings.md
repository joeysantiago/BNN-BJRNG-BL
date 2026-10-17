Sort `using` directives and remove unused namespaces in the specified scope (App-WebAPI and App-Database C# only).

Rule (full details in document/sort-usings.md):
- Remove every unused `using` (confirm with the build / compiler diagnostic IDE0005 — never remove one needed for extension methods, attributes, nameof or XML-doc crefs).
- Sort the rest in ONE block: `System` / `System.*` first, then all other namespaces alphabetically (ordinal). No blank lines between usings; one blank line before `namespace`.
- `using static` after normal usings, then `using Alias = ...`; `global using` in its own block above everything.
- Pure cleanup — never change code. Build the affected API projects afterwards.

Example:
Before: using Microsoft.EntityFrameworkCore; / using Thakurg.Contracts.Wrappers; / using System.Text.Json; / (unused using)
After:  using System.Text.Json; / using Microsoft.EntityFrameworkCore; / using Thakurg.Contracts.Wrappers;

Scope: $ARGUMENTS
