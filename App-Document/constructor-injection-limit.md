# Constructor Injection Limit (App-WebAPI)

Applies to **controllers and services** in `App-WebAPI` only.

## Rule

- A controller or service constructor may take **at most 6 parameters**.
- If it needs more, do **not** add a 7th parameter. Group related dependencies into a **bundle** (a small interface + class registered once in DI) and inject the bundle instead.
- Bundle interfaces live in `Thakurg.Application/Common/`, implementations in `Thakurg.Infrastructure/Common/`, one type per file, registered in `Thakurg.Infrastructure/DependencyInjection.cs` (`AddThakurgServices`).
- Reuse an existing bundle before creating a new one. Group by cohesion (things that are used together), not just to hit the number.
- A bundle only exposes the dependencies as read-only properties — no logic.
- If a class still has more than 6 after bundling, move business logic out into a dedicated service rather than adding more bundles. (`MusicAccessService` was split out of `MusicService` for exactly this reason.)

## Existing bundles

There are none yet: every controller and service in `Thakurg` is within the limit (the largest, `MusicService`, takes exactly 6). Add the first bundle to this table when one is created.

| Bundle | Properties |
|---|---|
| _(none yet)_ | |

## Example

The example below is illustrative: `MusicService` has 6 parameters today, and this is what it would look like if it grew to 8.

### Don't (more than 6 parameters)

```csharp
public MusicService(IOptions<MusicStorageOptions> options, IOptions<StreamingOptions> streaming, IMusicFileStore fileStore, IMessageService messageService,
    IMusicRepository musicRepository, IMusicAccessService accessService, ISettingsRepository settingsRepository, IPasswordHasher passwordHasher)
```

### Do (bundles)

```csharp
public MusicService(IOptions<MusicStorageOptions> options, IOptions<StreamingOptions> streaming, IMusicFileStore fileStore, IMessageService messageService, IMusicRepository musicRepository, IMusicSecurityServices securityServices)
{
    _options = options.Value;
    _streaming = streaming.Value;
    _fileStore = fileStore;
    _messageService = messageService;
    _musicRepository = musicRepository;
    _accessService = securityServices.Access;
    _passwordHasher = securityServices.PasswordHasher;
}
```

The class may keep its private fields (assigned from the bundle properties) so the rest of the class is unchanged.

## Adding a new bundle

```csharp
// Thakurg.Application/Common/IMusicSecurityServices.cs
public interface IMusicSecurityServices
{
    IMusicAccessService Access { get; }

    IPasswordHasher PasswordHasher { get; }
}

// Thakurg.Infrastructure/Common/MusicSecurityServices.cs
public class MusicSecurityServices : IMusicSecurityServices
{
    public IMusicAccessService Access { get; }

    public IPasswordHasher PasswordHasher { get; }

    public MusicSecurityServices(IMusicAccessService access, IPasswordHasher passwordHasher)
    {
        Access = access;
        PasswordHasher = passwordHasher;
    }
}

// Thakurg.Infrastructure/DependencyInjection.cs
services.AddScoped<IMusicSecurityServices, MusicSecurityServices>();
```

Use the lifetime that matches the shortest-lived dependency inside the bundle (Scoped if any member is Scoped).

## Formatting

Follow `page-break.md` and `format-model.md` (blank line between properties) for the bundle files and wrapped constructors. Declarations inside a bundle class follow `declaration-order-by-length.md`.
