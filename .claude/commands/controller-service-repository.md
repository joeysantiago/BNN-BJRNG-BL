Apply the Controller -> Service -> Repository layering to the specified scope (App-WebAPI only).

Rule (full details in App-Document/controller-service-repository.md):
- Controller = HTTP only: routing, rate-limit attributes, binding inputs, ONE service call, returning the HTTP result. No calculations, validation, branching business logic, LINQ/data shaping, message building, or DbContext access.
- Service = all logic: validation, calculations, orchestration, DTO mapping, password/key checks, throwing BusinessException. Injects repositories/other services only; never a DbContext, ActionResult or HttpContext.
- Repository = database access only (queries, add/update/remove, SaveChanges, transactions). Injects ICommonDbContext. No business rules.
- Chain: MusicController -> IMusicService/MusicService -> IMusicRepository/MusicRepository.
- Interfaces in Thakurg.Application/Services and Thakurg.Application/Repositories; implementations in Thakurg.Infrastructure/Services and Thakurg.Infrastructure/Repositories; one type per file; register AddScoped in Thakurg.Infrastructure/DependencyInjection.cs (AddThakurgServices).
- Everything is reached through an interface via DI: MusicController -> IMusicService -> IMusicRepository, with MusicService/MusicRepository as the implementing classes. Constructors take interface types only (never a concrete service, repository or DbContext — add missing DbSets to ICommonDbContext instead). Register AddScoped<IX, X>(); never AddScoped<X>() for consumed types; never `new` a service/repository.
- Naming: `<Entity>Controller` -> `I<Entity>Service`/`<Entity>Service` -> `I<Entity>Repository`/`<Entity>Repository`; one service and repository per feature (may be shared across controllers). Features with no database (YouTube lookups, speed-test stream) have a service but no repository.
- Controllers inject services only. Constructors keep to App-Document/constructor-injection-limit.md (max 6, use bundles).
- Keep endpoint routes, request/response shapes and behaviour identical — this is a pure refactor.
- Build the affected API projects afterwards to confirm DI still resolves.

Example:

Before (controller queries the database and shapes the result):
var tracks = await _dbContext.MusicTracks.AsNoTracking().OrderBy(t => t.SortOrder)
    .Select(t => new MusicTrackDto { Id = t.Id, Title = t.Title }).ToListAsync(ct);
return Ok(ApiResponse<List<MusicTrackDto>>.SuccessResponse(tracks));

After:
Controller:  var tracks = await _musicService.ListAsync(player, ct); return Ok(ApiResponse<MusicTracksDto>.SuccessResponse(tracks));
Service:     var tracks = await _musicRepository.GetTracksAsync(musicPlayer.Id, ct); return ToDto(musicPlayer, tracks);
Repository:  return _dbContext.MusicTracks.AsNoTracking().WhereActive().Where(t => t.PlayerId == playerId).OrderBy(t => t.SortOrder).ToListAsync(ct);

Scope: $ARGUMENTS
