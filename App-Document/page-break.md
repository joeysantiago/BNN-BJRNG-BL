# Code Formatting Standard — Line Breaks for Method Signatures

This document defines how method/function signatures (and similarly long constructor calls, function calls) are laid out. The line-length limit is **250 characters**.

## Rule

1. **Keep it on one line if it fits.** A method/function/constructor declaration (or a call) is written on a **single line** — name, all parameters and return type — as long as the whole line, **indentation included, is 250 characters or fewer**. The number of parameters does not matter.
2. **Only if it exceeds 250 characters, wrap.** Do **not** put one parameter per line. Group parameters **4 to 5 per line**, then wrap to a new line (indented one level deeper) and continue with the next 4 to 5; every line, indentation included, must stay within 250 characters.
3. A declaration with **4 or fewer parameters** never wraps, even beyond 250 characters (see `signature-single-line.md`).

This applies to:
- Method/function declarations
- Constructors
- Function/method calls with many arguments (only where the argument list contains no lambda/function bodies, object/collection initializers, comments or nested multi-line expressions — those keep their natural layout)
- Interface/type method signatures

It applies regardless of language (C#, TypeScript, JavaScript, SQL stored procedure parameters, etc.).

## ❌ Don't

Wrapped although the whole signature fits within 250 characters:

```csharp
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request,
    CancellationToken cancellationToken)
{
    ...
}
```

One parameter per line:

```csharp
public async Task<Result> CreateOrder(
    int customerId,
    string orderNumber,
    DateTime orderDate,
    decimal totalAmount,
    string currency,
    string status,
    int? warehouseId,
    string createdBy)
{
    ...
}
```

## ✅ Do

Fits in 250 characters → single line:

```csharp
public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
{
    ...
}
```

Longer than 250 characters → 4–5 parameters per line:

```csharp
public async Task<Result<OrderConfirmationWithFulfilmentAndInvoiceDetails>> CreateOrderWithFulfilmentAndInvoice(int customerId, string orderNumber, DateTime orderDate, decimal totalAmount,
    string currency, string status, int? warehouseId, string createdBy)
{
    ...
}
```

```typescript
function createUser(firstName: string, lastName: string, email: string, phone: string, role: string, isActive: boolean, createdBy: string): User {
    ...
}
```

## Guidance

- Measure the whole physical line including leading indentation; count it before deciding to wrap.
- When wrapping is needed, aim for **4 to 5 parameters per line**; never drop to one parameter per line just because a signature is long.
- Keep the closing parenthesis and return type/opening brace on the same line as the last parameter group, unless the language/project formatter dictates otherwise.
- The same 250-character / 4–5-per-line logic applies to call sites that pass many arguments.
- HTML/Angular templates follow their own limit in `html-single-line.md` (250) — this document does not change it.
