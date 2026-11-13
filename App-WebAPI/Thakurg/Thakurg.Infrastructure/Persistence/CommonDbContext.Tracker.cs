using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Persistence;

// The tables of SnapTracker (SqlScripts/CREATE/Tracker). A transaction owns its original SMS text (TransactionId).
public partial class CommonDbContext
{
    public DbSet<TrackerUser> TrackerUsers => Set<TrackerUser>();

    public DbSet<TrackerAlert> TrackerAlerts => Set<TrackerAlert>();

    public DbSet<TrackerAccount> TrackerAccounts => Set<TrackerAccount>();

    public DbSet<TrackerSmsText> TrackerSmsTexts => Set<TrackerSmsText>();

    public DbSet<TrackerTransaction> TrackerTransactions => Set<TrackerTransaction>();

    public DbSet<TrackerCategoryRule> TrackerCategoryRules => Set<TrackerCategoryRule>();

    #region Private Methods

    partial void OnTrackerModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TrackerUser>().ToTable("TrackerUsers");
        modelBuilder.Entity<TrackerAlert>().ToTable("TrackerAlerts");
        modelBuilder.Entity<TrackerAccount>().ToTable("TrackerAccounts");
        modelBuilder.Entity<TrackerSmsText>().ToTable("TrackerSmsTexts");
        modelBuilder.Entity<TrackerCategoryRule>().ToTable("TrackerCategoryRules");
        modelBuilder.Entity<TrackerTransaction>().ToTable("TrackerTransactions");
        modelBuilder.Entity<TrackerTransaction>().HasOne(t => t.SmsText).WithOne().HasForeignKey<TrackerSmsText>(s => s.TransactionId);
    }

    #endregion
}
