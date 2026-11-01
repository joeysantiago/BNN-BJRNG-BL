using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

public partial class CommonDbContext
{
    public DbSet<MusicTrack> MusicTracks => Set<MusicTrack>();

    public DbSet<MusicPlayer> MusicPlayers => Set<MusicPlayer>();

    #region Private Methods

    partial void OnMusicModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MusicTrack>().ToTable("MusicTracks");
        modelBuilder.Entity<MusicPlayer>().ToTable("MusicPlayers");
    }

    #endregion
}
