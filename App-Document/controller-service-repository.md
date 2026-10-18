# Controller → Service → Repository (App-WebAPI)

Applies to every API in `App-WebAPI` (currently `Thakurg.API`).

## Rule

Every endpoint flows through three layers, one direction only:

```
MusicController  ->  IMusicService  ->  IMusicRepository
(HTTP only)          (all logic)        (all database access)
```

| Layer | Responsible for | Must NOT contain |
|---|---|---|
| **Controller** | Routing, rate-limit attributes, binding request/query/route/header values, calling **one service method**, returning the HTTP result (`Ok(...)`, `File(...)`, `PacketFileResult`) | Calculations, validation rules, branching business logic, loops/LINQ over data, mapping/shaping data, building messages, direct `DbContext` access |
| **Service** | Business logic: validation, calculations, orchestration, mapping entities to DTOs, password and key checks, throwing `BusinessException` | `DbContext`/`DbSet`/EF queries, `HttpContext`/`ActionResult` types |
| **Repository** | Database access only: queries, inserts, updates, deletes, `SaveChangesAsync`, transactions | Business rules, DTO shaping beyond projection, HTTP concerns |

- A controller action is a thin pass-through: read inputs → `await _service.Method(...)` → wrap in `ApiResponse`/`Ok`. Anything more than that belongs in the service.
- Controllers inject **services only** (plus framework types). Never inject a repository or a `DbContext` into a controller.
- Services inject **repositories and other services** (and infrastructure abstractions such as `IMusicFileStore`, `IPasswordHasher`). Never inject a `DbContext` into a service.
- Repositories inject the `DbContext` through its interface (`ICommonDbContext`).
- Naming is `<Entity>Controller` → `I<Entity>Service` / `<Entity>Service` → `I<Entity>Repository` / `<Entity>Repository`. One service and one repository per controller/feature; they may be shared when a feature spans controllers (for example `ISettingsRepository` serves the settings and speed-test services).
- Features with no database (for example the YouTube lookups and the speed-test data stream) have a service but no repository; the service talks to its external library or stream helper through an interface.
- Constructors still obey `App-Document/constructor-injection-limit.md` (max 6 parameters, use bundles).

## Interfaces and dependency injection (mandatory)

Every layer is reached **through an interface, resolved by DI** — a caller never depends on a concrete class and never does `new` on a service/repository:

```
MusicController  ->  IMusicService  ->  IMusicRepository
                     (MusicService)     (MusicRepository)
```

- Every service has an `I<Entity>Service` interface and an `<Entity>Service` class; every repository has an `I<Entity>Repository` interface and an `<Entity>Repository` class. The class implements the interface.
- Constructors (controllers, services, repositories) declare **interface-typed** parameters only: `IMusicService`, `IMusicRepository`, `ICommonDbContext`, … — never `MusicService`, `MusicRepository` or the concrete `CommonDbContext`. If a repository needs a `DbSet` that the context interface doesn't expose, add the `DbSet` to `ICommonDbContext` instead of injecting the concrete context. (Third-party client types such as `YoutubeClient` and option wrappers such as `IOptions<T>` are the only non-project types a service may take.)
- Register each pair as `services.AddScoped<IMusicService, MusicService>()` (interface first, implementation second). Never register or resolve a bare concrete type for something other code consumes (`AddScoped<MusicService>()` is not allowed).
- Never `new` a service or repository in a controller/service; always receive it by constructor injection.
- The only allowed exception is framework plumbing resolved inside the DI setup itself, which no application code injects.

## File layout

Interfaces live in the `Thakurg.Application` project, implementations in the `Thakurg.Infrastructure` project, one type per file:

| Type | Location |
|---|---|
| `I<Entity>Service` | `Thakurg.Application/Services/I<Entity>Service.cs` (namespace `Thakurg.Application.Services`) |
| `I<Entity>Repository` | `Thakurg.Application/Repositories/I<Entity>Repository.cs` (namespace `Thakurg.Application.Repositories`) |
| `<Entity>Service` | `Thakurg.Infrastructure/Services/<Entity>Service.cs` (namespace `Thakurg.Infrastructure.Services`) |
| `<Entity>Repository` | `Thakurg.Infrastructure/Repositories/<Entity>Repository.cs` (namespace `Thakurg.Infrastructure.Repositories`) |

Request/response DTOs and options stay in `Thakurg.Contracts`, entities in `Thakurg.Domain` (see `App-Document/format-model.md`). Register every service and repository as `AddScoped<IX, X>()` in `Thakurg.Infrastructure/DependencyInjection.cs` (`AddThakurgServices`), next to the existing registrations.

## Example

### Don't

```csharp
[HttpGet("{player}/tracks")]
public async Task<ActionResult<ApiResponse<MusicTracksDto>>> List(string player, CancellationToken cancellationToken)
{
    var tracks = await _dbContext.MusicTracks.AsNoTracking()
        .Where(t => t.Player.Code == player).OrderBy(t => t.SortOrder)
        .Select(t => new MusicTrackDto { Id = t.Id, Title = t.Title, AudioUrl = $"/music/{player}/tracks/{t.Id}/audio" })
        .ToListAsync(cancellationToken);

    return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(new MusicTracksDto { Tracks = tracks }));
}
```

### Do

```csharp
// MusicController
[HttpGet("{player}/tracks")]
public async Task<ActionResult<ApiResponse<MusicTracksDto>>> List(string player, CancellationToken cancellationToken)
{
    var tracks = await _musicService.ListAsync(player, cancellationToken);

    return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(tracks));
}

// MusicService
public async Task<MusicTracksDto> ListAsync(string player, CancellationToken cancellationToken)
{
    var musicPlayer = await RequirePlayerAsync(player, cancellationToken);
    var tracks = await _musicRepository.GetTracksAsync(musicPlayer.Id, cancellationToken);

    return ToDto(musicPlayer, tracks);
}

// MusicRepository
public Task<List<MusicTrack>> GetTracksAsync(int playerId, CancellationToken cancellationToken)
{
    return _dbContext.MusicTracks.AsNoTracking().WhereActive().Where(t => t.PlayerId == playerId).OrderBy(t => t.SortOrder).ThenBy(t => t.Id).ToListAsync(cancellationToken);
}
```

## Checklist when adding or editing an endpoint

1. Controller action only binds inputs, calls the service, returns the HTTP result.
2. New logic goes in the service; new queries go in the repository (add the method to the interface first).
3. No `DbContext`/`DbSet`/`IQueryable` in a controller or service; no `ActionResult`/`HttpContext` in a service or repository.
4. New service/repository has an interface, is registered `AddScoped<IX, X>()`, and is injected by interface everywhere.
5. No constructor takes a concrete service, repository or `DbContext` type.
6. Build the affected API project.
