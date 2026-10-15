Limit controller and service constructor injection to 6 parameters in the specified scope (App-WebAPI only).

Rule (full details in document/constructor-injection-limit.md):
- A controller or service constructor may take at most 6 parameters.
- If it has more, group related dependencies into a bundle (interface in
  Generic.Application/Common, implementation in Generic.Infrastructure/Common, one type per file,
  registered in Generic.Infrastructure/DependencyInjection.cs) and inject the bundle instead.
- Reuse an existing bundle first: ITableServices, INotificationServices, IUserSecurityServices,
  ISettingsServices. Only create a new bundle for a genuinely new cohesive group.
- Keep the class's private fields, assigned from the bundle properties, so the rest of the class
  is unchanged.
- Bundles expose read-only properties only — no logic.
- Wrap constructors per document/page-break.md; bundle models follow document/format-model.md.
- Build the affected API projects afterwards to confirm DI still resolves.

Example:

Before:
public UsersController(ICommonDbContext dbContext, ITableQueryExecutor q, IRowActionExecutor r, ICurrentUserService u, IPasswordHasherService p, IEntityIdCodec c, IAccountNotificationService a, IAppNotificationService n)

After:
public UsersController(ICommonDbContext dbContext, ITableServices tableServices, INotificationServices notificationServices, IUserSecurityServices userSecurityServices)
