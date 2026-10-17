using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

public class CommonDbContext : DbContext, ICommonDbContext
{
    public DbSet<Feature> Features => Set<Feature>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<PageName> PageNames => Set<PageName>();

    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    public DbSet<MusicTrack> MusicTracks => Set<MusicTrack>();

    public DbSet<MusicPlayer> MusicPlayers => Set<MusicPlayer>();

    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();

    public DbSet<PageTranslation> Translations => Set<PageTranslation>();

    public DbSet<ConnectionField> ConnectionFields => Set<ConnectionField>();

    public CommonDbContext(DbContextOptions<CommonDbContext> options) : base(options)
    {
    }

    #region Private Methods

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Feature>().ToTable("Features");
        modelBuilder.Entity<Message>().ToTable("Messages");
        modelBuilder.Entity<PageName>().ToTable("PageNames");
        modelBuilder.Entity<AppSetting>().ToTable("AppSettings");
        modelBuilder.Entity<MusicTrack>().ToTable("MusicTracks");
        modelBuilder.Entity<ServiceItem>().ToTable("ServiceItems");
        modelBuilder.Entity<MusicPlayer>().ToTable("MusicPlayers");
        modelBuilder.Entity<ConnectionField>().ToTable("ConnectionFields");
        modelBuilder.Entity<PageTranslation>().ToTable("Translations");
    }

    #endregion
}
