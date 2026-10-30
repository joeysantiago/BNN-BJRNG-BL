using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

public class CommonDbContext : DbContext, ICommonDbContext
{
    public DbSet<Feature> Features => Set<Feature>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<KhataOtp> KhataOtps => Set<KhataOtp>();

    public DbSet<PageName> PageNames => Set<PageName>();

    public DbSet<KhataBook> KhataBooks => Set<KhataBook>();

    public DbSet<KhataUser> KhataUsers => Set<KhataUser>();

    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    public DbSet<MusicTrack> MusicTracks => Set<MusicTrack>();

    public DbSet<MusicPlayer> MusicPlayers => Set<MusicPlayer>();

    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();

    public DbSet<KhataContact> KhataContacts => Set<KhataContact>();

    public DbSet<KhataSession> KhataSessions => Set<KhataSession>();

    public DbSet<KhataAuditLog> KhataAuditLogs => Set<KhataAuditLog>();

    public DbSet<KhataPinProof> KhataPinProofs => Set<KhataPinProof>();

    public DbSet<KhataCurrency> KhataCurrencies => Set<KhataCurrency>();

    public DbSet<PageTranslation> Translations => Set<PageTranslation>();

    public DbSet<ConnectionField> ConnectionFields => Set<ConnectionField>();

    public DbSet<KhataPinAttempt> KhataPinAttempts => Set<KhataPinAttempt>();

    public DbSet<KhataTransaction> KhataTransactions => Set<KhataTransaction>();

    public DbSet<KhataIdempotencyKey> KhataIdempotencyKeys => Set<KhataIdempotencyKey>();

    public DbSet<KhataTransactionHistory> KhataTransactionHistory => Set<KhataTransactionHistory>();

    public CommonDbContext(DbContextOptions<CommonDbContext> options) : base(options)
    {
    }

    #region Public Methods

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampNewRows();

        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampNewRows();

        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    #endregion

    #region Private Methods

    // Models carry no default values (App-Document/model-no-default-values.md): a new row is made active and stamped with its creation time here.
    private void StampNewRows()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>().Where(e => e.State == EntityState.Added))
        {
            entry.Entity.IsActive = true;
            entry.Entity.CreatedOn = now;
        }
    }

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
        modelBuilder.Entity<KhataOtp>().ToTable("KhataOtps");
        modelBuilder.Entity<KhataUser>().ToTable("KhataUsers");
        modelBuilder.Entity<KhataSession>().ToTable("KhataSessions");
        modelBuilder.Entity<KhataAuditLog>().ToTable("KhataAuditLog");
        modelBuilder.Entity<KhataPinProof>().ToTable("KhataPinProofs");
        modelBuilder.Entity<KhataPinAttempt>().ToTable("KhataPinAttempts");
        modelBuilder.Entity<KhataBook>().ToTable("KhataBooks");
        modelBuilder.Entity<KhataCurrency>().ToTable("KhataCurrencies");
        modelBuilder.Entity<KhataTransactionHistory>().ToTable("KhataTransactionHistory");
        modelBuilder.Entity<KhataIdempotencyKey>().ToTable("KhataIdempotencyKeys");
        modelBuilder.Entity<KhataContact>().ToTable("KhataContacts").Property(c => c.RowVersion).IsRowVersion();
        modelBuilder.Entity<KhataTransaction>().ToTable("KhataTransactions").Property(t => t.RowVersion).IsRowVersion();
    }

    #endregion
}
