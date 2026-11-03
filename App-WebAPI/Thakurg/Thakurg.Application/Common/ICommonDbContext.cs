using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public partial interface ICommonDbContext
{
    DbSet<App> Apps { get; }

    DbSet<Page> Pages { get; }

    DbSet<Role> Roles { get; }

    DbSet<User> Users { get; }

    DatabaseFacade Database { get; }

    DbSet<Feature> Features { get; }

    DbSet<Message> Messages { get; }

    DbSet<UserProfile> UserProfiles { get; }

    DbSet<OneTimeCode> OneTimeCodes { get; }

    DbSet<PageName> PageNames { get; }

    DbSet<AppSetting> AppSettings { get; }

    DbSet<ServiceItem> ServiceItems { get; }

    DbSet<UserFeature> UserFeatures { get; }

    DbSet<UserSession> UserSessions { get; }

    DbSet<UserAppAccess> UserAppAccess { get; }

    DbSet<PageTranslation> Translations { get; }

    DbSet<RolePermission> RolePermissions { get; }

    DbSet<ConnectionField> ConnectionFields { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}
