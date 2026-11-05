using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

public partial class CommonDbContext : DbContext, ICommonDbContext
{
    public DbSet<App> Apps => Set<App>();

    public DbSet<Page> Pages => Set<Page>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Feature> Features => Set<Feature>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<PageName> PageNames => Set<PageName>();

    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    public DbSet<MailSetting> MailSettings => Set<MailSetting>();

    public DbSet<OneTimeCode> OneTimeCodes => Set<OneTimeCode>();

    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();

    public DbSet<UserFeature> UserFeatures => Set<UserFeature>();

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    public DbSet<UserSession> UserSessions => Set<UserSession>();

    public DbSet<UserAppAccess> UserAppAccess => Set<UserAppAccess>();

    public DbSet<PageTranslation> Translations => Set<PageTranslation>();

    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<ConnectionField> ConnectionFields => Set<ConnectionField>();

    public DbSet<WhatsAppSetting> WhatsAppSettings => Set<WhatsAppSetting>();

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

    // Each feature maps its own tables in its own file (CommonDbContext.<Feature>.cs). A branch without that file still builds: the call is dropped.
    partial void OnMusicModelCreating(ModelBuilder modelBuilder);

    partial void OnTasksModelCreating(ModelBuilder modelBuilder);

    partial void OnKhataModelCreating(ModelBuilder modelBuilder);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<App>().ToTable("Apps");
        modelBuilder.Entity<Page>().ToTable("Pages");
        modelBuilder.Entity<Role>().ToTable("Roles");
        modelBuilder.Entity<User>().ToTable("Users");
        modelBuilder.Entity<Feature>().ToTable("Features");
        modelBuilder.Entity<Message>().ToTable("Messages");
        modelBuilder.Entity<PageName>().ToTable("PageNames");
        modelBuilder.Entity<AppSetting>().ToTable("AppSettings");
        modelBuilder.Entity<MailSetting>().ToTable("MailSettings");
        modelBuilder.Entity<WhatsAppSetting>().ToTable("WhatsAppSettings");
        modelBuilder.Entity<UserProfile>().ToTable("UserProfiles");
        modelBuilder.Entity<OneTimeCode>().ToTable("OneTimeCodes");
        modelBuilder.Entity<ServiceItem>().ToTable("ServiceItems");
        modelBuilder.Entity<UserSession>().ToTable("UserSessions");
        modelBuilder.Entity<UserFeature>().ToTable("UserFeatures");
        modelBuilder.Entity<UserAppAccess>().ToTable("UserAppAccess");
        modelBuilder.Entity<PageTranslation>().ToTable("Translations");
        modelBuilder.Entity<ConnectionField>().ToTable("ConnectionFields");
        modelBuilder.Entity<RolePermission>().ToTable("RolePermissions");

        OnMusicModelCreating(modelBuilder);
        OnKhataModelCreating(modelBuilder);
        OnTasksModelCreating(modelBuilder);
    }

    #endregion
}
