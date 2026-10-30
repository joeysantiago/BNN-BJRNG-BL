using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public interface ICommonDbContext
{
    DbSet<Feature> Features { get; }

    DbSet<Message> Messages { get; }

    DatabaseFacade Database { get; }

    DbSet<KhataOtp> KhataOtps { get; }

    DbSet<PageName> PageNames { get; }

    DbSet<KhataUser> KhataUsers { get; }

    DbSet<KhataBook> KhataBooks { get; }

    DbSet<AppSetting> AppSettings { get; }

    DbSet<MusicTrack> MusicTracks { get; }

    DbSet<ServiceItem> ServiceItems { get; }

    DbSet<MusicPlayer> MusicPlayers { get; }

    DbSet<KhataSession> KhataSessions { get; }

    DbSet<KhataContact> KhataContacts { get; }

    DbSet<KhataAuditLog> KhataAuditLogs { get; }

    DbSet<KhataPinProof> KhataPinProofs { get; }

    DbSet<PageTranslation> Translations { get; }

    DbSet<KhataCurrency> KhataCurrencies { get; }

    DbSet<ConnectionField> ConnectionFields { get; }

    DbSet<KhataPinAttempt> KhataPinAttempts { get; }

    DbSet<KhataTransaction> KhataTransactions { get; }

    DbSet<KhataIdempotencyKey> KhataIdempotencyKeys { get; }

    DbSet<KhataTransactionHistory> KhataTransactionHistory { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
}
