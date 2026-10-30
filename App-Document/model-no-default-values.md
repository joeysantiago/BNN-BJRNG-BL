Never put hard-coded default values in models in the specified scope; values come from appsettings.json or are set by the code that creates the object (App-WebAPI, App-Database, App-WebUI).

Rule:
- **Models** are entities (`Thakurg.Domain`), DTOs and option classes (`Thakurg.Contracts`), configuration classes in `App-Database`, and model classes/interfaces in `App-WebUI`.
- A model property or field **must not be initialised with a real value**. Not allowed:
  - literals: numbers, strings, `true`/`false`, `'x'`
  - `new(21, 0)`, `new() { Permit = 10 }`, `[".jpg", ".png"]`, or any collection with items
  - `DateTime.UtcNow` or any other computed value
  - a reference to a constant (`= Local`)
- **Allowed**, because they hold no data and only keep C# null-safety:
  - `= string.Empty`, `= new()` (no arguments, no initializer), `= []`, `= Array.Empty<T>()`
  - `= Stream.Null`, `= default!`
- **`const` names** that identify something (`SectionName`, message codes, claim and policy names) are allowed. They are names, not configurable data.
- **Where the value goes instead:**
  - **Settings** (limits, durations, paths, file types, names): `appsettings.json`, in the section bound to the option class. Every option property is present there. Environment files (`appsettings.Development/QA/UAT/Live.json`) override only what differs.
  - **Values a new entity starts with:** the service that creates the entity sets them, reading them from options. Example: a new `KhataUser` gets `Language`, `TimeZone` and `DailySummaryTime` from `Khata:NewUser`.
  - **Audit columns of every new row** (`IsActive = true`, `CreatedOn = UTC now`): stamped centrally in `CommonDbContext.SaveChanges/SaveChangesAsync`, so no entity or service repeats them.
  - **DTO values:** set by the service that builds the DTO (`new FileStreamDto { Content = …, ContentType = … }`).
- **A missing configuration section stops the API at startup.** Never fall back to `?? new XOptions()`: that would now silently mean zeros and empty strings. Use `?? throw new InvalidOperationException(...)` or `.Validate(...).ValidateOnStart()`.
- After removing an initializer, re-sort the declarations: the length changed (`declaration-order-by-length.md`).
- Removing a default must not change behaviour. Before removing one, find every place that creates the model, and make sure each sets the value or the value is now in `appsettings.json`.

Example:

Wrong:
```csharp
public class KhataUser : BaseEntity
{
    public string TimeZone { get; set; } = "Asia/Kolkata";

    public TimeOnly DailySummaryTime { get; set; } = new(21, 0);
}

public class RateLimitOptions
{
    public int WindowSeconds { get; set; } = 60;
}
```

Right:
```csharp
public class KhataUser : BaseEntity
{
    public TimeOnly DailySummaryTime { get; set; }

    public string TimeZone { get; set; } = string.Empty;
}

// appsettings.json
"Khata": { "NewUser": { "Language": "en", "TimeZone": "Asia/Kolkata", "DailySummaryTime": "21:00" } },
"RateLimiting": { "WindowSeconds": 60 }

// KhataAuthService, when the user is created
new KhataUser { Email = email, Language = _options.NewUser.Language, TimeZone = _options.NewUser.TimeZone, DailySummaryTime = _options.NewUser.DailySummaryTime };
```

Reference: App-WebAPI\Thakurg\Thakurg.Domain\Common\BaseEntity.cs, App-WebAPI\Thakurg\Thakurg.Infrastructure\Persistence\CommonDbContext.cs, App-WebAPI\Thakurg\Thakurg.Contracts\Configurations\KhataNewUserOptions.cs
