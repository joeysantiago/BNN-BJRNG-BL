using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public interface ICommonDbContext
{
    DbSet<Feature> Features { get; }

    DbSet<Message> Messages { get; }

    DbSet<KhataOtp> KhataOtps { get; }

    DbSet<PageName> PageNames { get; }

    DbSet<KhataUser> KhataUsers { get; }

    DbSet<AppSetting> AppSettings { get; }

    DbSet<MusicTrack> MusicTracks { get; }

    DbSet<ServiceItem> ServiceItems { get; }

    DbSet<MusicPlayer> MusicPlayers { get; }

    DbSet<KhataSession> KhataSessions { get; }

    DbSet<KhataAuditLog> KhataAuditLogs { get; }

    DbSet<KhataPinProof> KhataPinProofs { get; }

    DbSet<PageTranslation> Translations { get; }

    DbSet<ConnectionField> ConnectionFields { get; }

    DbSet<KhataPinAttempt> KhataPinAttempts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
