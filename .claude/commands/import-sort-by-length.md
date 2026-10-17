Sort the `import` statements by length in the specified scope (App-WebUI TypeScript; skip *.spec.ts).

Rule (full details in document/import-sort-by-length.md):
- Sort the top-of-file import block by the character count of the whole statement written on one line (`import` ... `;`, wrapped imports measured joined with single spaces), shortest first, longest last.
- Ties: alphabetical by module path (ordinal). One block, no blank lines inside it, one blank line after it.
- Side-effect imports (`import 'x';`) keep their original order and stay at the top of the block.
- Pure reorder — never rename, merge, remove or reflow imports. Leave a file alone if comments inside the block make the reorder unclear.
- Type-check / build afterwards.

Example:
import { A } from 'a';
import { Aa } from 'aa';
import { Aaa, Bbb } from 'aaa';

Scope: $ARGUMENTS
