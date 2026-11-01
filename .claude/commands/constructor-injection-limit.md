Limit controller and service constructor injection to 6 parameters in the specified scope (App-WebAPI only).

Rule (full details in App-Document/constructor-injection-limit.md):
- A controller or service constructor may take at most 6 parameters.
- If it has more, group related dependencies into a bundle (interface in
  Thakurg.Application/Common, implementation in Thakurg.Infrastructure/Common, one type per file,
  registered in Thakurg.Infrastructure/DependencyInjection.cs) and inject the bundle instead.
- Reuse an existing bundle first (none exist yet in Thakurg). Only create a new bundle for a
  genuinely new cohesive group; if a class still has more than 6, split logic into another service.
- Keep the class's private fields, assigned from the bundle properties, so the rest of the class
  is unchanged.
- Bundles expose read-only properties only — no logic. Group by cohesion (things used together), not just to hit the number; use the lifetime of the shortest-lived member (Scoped if any member is Scoped).
- Wrap constructors per App-Document/page-break.md; bundle models follow App-Document/format-model.md; their declarations follow App-Document/declaration-order-by-length.md.
- Build the affected API projects afterwards to confirm DI still resolves.

Example (illustrative):

Before:
public MusicService(IOptions<MusicStorageOptions> o, IOptions<StreamingOptions> s, IMusicFileStore f, IMessageService m, IMusicRepository r, IMusicAccessService a, ISettingsRepository sr, IPasswordHasher p)

After:
public MusicService(IOptions<MusicStorageOptions> o, IOptions<StreamingOptions> s, IMusicFileStore f, IMessageService m, IMusicRepository r, IMusicSecurityServices securityServices)

Scope: $ARGUMENTS
