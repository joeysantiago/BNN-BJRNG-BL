Simplify single-statement if blocks in the specified scope.

Rule:
- If an `if` block contains exactly one statement, remove the curly
  braces and place the statement on the next line, indented — do not
  put it on the same line as the `if`.
- Only applies when the if-block body has exactly one statement.
- Do NOT apply this if there's an `else`, `else if`, or the body has
  more than one statement — leave those with braces as-is.
- Preserve the condition exactly as written.

Example:

Before:
if (response)
{
    return null;
}

After:
if (response)
    return null;