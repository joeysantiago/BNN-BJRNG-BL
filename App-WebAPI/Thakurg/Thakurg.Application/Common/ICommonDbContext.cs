using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public partial interface ICommonDbContext
{
    DbSet<App> Apps { get; }

    DbSet<User> Users { get; }

    DatabaseFacade Database { get; }

    DbSet<Feature> Features { get; }

    DbSet<Message> Messages { get; }

    DbSet<PageName> PageNames { get; }

    DbSet<AppSetting> AppSettings { get; }

    DbSet<ServiceItem> ServiceItems { get; }

    DbSet<UserSession> UserSessions { get; }

    DbSet<UserAppAccess> UserAppAccess { get; }

    DbSet<PageTranslation> Translations { get; }

    DbSet<ConnectionField> ConnectionFields { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}
