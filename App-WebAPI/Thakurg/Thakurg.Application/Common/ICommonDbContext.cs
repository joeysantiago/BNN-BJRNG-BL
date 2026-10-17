using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public interface ICommonDbContext
{
    DbSet<Feature> Features { get; }

    DbSet<Message> Messages { get; }

    DbSet<PageName> PageNames { get; }

    DbSet<AppSetting> AppSettings { get; }

    DbSet<MusicTrack> MusicTracks { get; }

    DbSet<ServiceItem> ServiceItems { get; }

    DbSet<MusicPlayer> MusicPlayers { get; }

    DbSet<PageTranslation> Translations { get; }

    DbSet<ConnectionField> ConnectionFields { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
