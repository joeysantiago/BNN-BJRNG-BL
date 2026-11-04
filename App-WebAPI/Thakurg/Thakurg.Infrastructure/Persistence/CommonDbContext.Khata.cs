using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

public partial class CommonDbContext
{
    public DbSet<KhataBook> KhataBooks => Set<KhataBook>();

    public DbSet<KhataUser> KhataUsers => Set<KhataUser>();

    public DbSet<KhataContact> KhataContacts => Set<KhataContact>();

    public DbSet<KhataAuditLog> KhataAuditLogs => Set<KhataAuditLog>();

    public DbSet<KhataCurrency> KhataCurrencies => Set<KhataCurrency>();

    public DbSet<KhataAttachment> KhataAttachments => Set<KhataAttachment>();

    public DbSet<KhataStoredFile> KhataStoredFiles => Set<KhataStoredFile>();

    public DbSet<KhataLockSession> KhataLockSessions => Set<KhataLockSession>();

    public DbSet<KhataTransaction> KhataTransactions => Set<KhataTransaction>();

    public DbSet<KhataIdempotencyKey> KhataIdempotencyKeys => Set<KhataIdempotencyKey>();

    public DbSet<KhataStorageSetting> KhataStorageSettings => Set<KhataStorageSetting>();

    public DbSet<KhataNotificationLog> KhataNotificationLogs => Set<KhataNotificationLog>();

    public DbSet<KhataNotificationPref> KhataNotificationPrefs => Set<KhataNotificationPref>();

    public DbSet<KhataTransactionHistory> KhataTransactionHistory => Set<KhataTransactionHistory>();

    #region Private Methods

    partial void OnKhataModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<KhataBook>().ToTable("KhataBooks");
        modelBuilder.Entity<KhataUser>().ToTable("KhataUsers");
        modelBuilder.Entity<KhataAuditLog>().ToTable("KhataAuditLog");
        modelBuilder.Entity<KhataLockSession>().ToTable("KhataLockSessions");
        modelBuilder.Entity<KhataCurrency>().ToTable("KhataCurrencies");
        modelBuilder.Entity<KhataStoredFile>().ToTable("KhataStoredFiles");
        modelBuilder.Entity<KhataNotificationLog>().ToTable("KhataNotificationLog");
        modelBuilder.Entity<KhataStorageSetting>().ToTable("KhataStorageSettings");
        modelBuilder.Entity<KhataNotificationPref>().ToTable("KhataNotificationPrefs");
        modelBuilder.Entity<KhataAttachment>().ToTable("KhataAttachments");
        modelBuilder.Entity<KhataIdempotencyKey>().ToTable("KhataIdempotencyKeys");
        modelBuilder.Entity<KhataTransactionHistory>().ToTable("KhataTransactionHistory");
        modelBuilder.Entity<KhataContact>().ToTable("KhataContacts").Property(c => c.RowVersion).IsRowVersion();
        modelBuilder.Entity<KhataTransaction>().ToTable("KhataTransactions").Property(t => t.RowVersion).IsRowVersion();
    }

    #endregion
}
