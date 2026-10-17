Limit controller and service constructor injection to 6 parameters in the specified scope (App-WebAPI only).

Rule (full details in document/constructor-injection-limit.md):
- A controller or service constructor may take at most 6 parameters.
- If it has more, group related dependencies into a bundle (interface in
  Thakurg.Application/Common, implementation in Thakurg.Infrastructure/Common, one type per file,
  registered in Thakurg.Infrastructure/DependencyInjection.cs) and inject the bundle instead.
- Reuse an existing bundle first (none exist yet in Thakurg). Only create a new bundle for a
  genuinely new cohesive group; if a class still has more than 6, split logic into another service.
- Keep the class's private fields, assigned from the bundle properties, so the rest of the class
  is unchanged.
- Bundles expose read-only properties only — no logic.
- Wrap constructors per document/page-break.md; bundle models follow document/format-model.md.
- Build the affected API projects afterwards to confirm DI still resolves.

Example (illustrative):

Before:
public MusicService(IOptions<MusicStorageOptions> o, IOptions<StreamingOptions> s, IMusicFileStore f, IMessageService m, IMusicRepository r, IMusicAccessService a, ISettingsRepository sr, IPasswordHasher p)

After:
public MusicService(IOptions<MusicStorageOptions> o, IOptions<StreamingOptions> s, IMusicFileStore f, IMessageService m, IMusicRepository r, IMusicSecurityServices securityServices)

Scope: $ARGUMENTS
