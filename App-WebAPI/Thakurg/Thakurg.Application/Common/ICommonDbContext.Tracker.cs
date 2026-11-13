using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

// The tables of SnapTracker (SqlScripts/CREATE/Tracker).
public partial interface ICommonDbContext
{
    DbSet<TrackerUser> TrackerUsers { get; }

    DbSet<TrackerAlert> TrackerAlerts { get; }

    DbSet<TrackerAccount> TrackerAccounts { get; }

    DbSet<TrackerSmsText> TrackerSmsTexts { get; }

    DbSet<TrackerTransaction> TrackerTransactions { get; }

    DbSet<TrackerCategoryRule> TrackerCategoryRules { get; }
}
