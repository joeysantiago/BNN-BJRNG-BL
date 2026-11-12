using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public partial interface ICommonDbContext
{
    DbSet<KhataBook> KhataBooks { get; }

    DbSet<KhataUser> KhataUsers { get; }

    DbSet<KhataContact> KhataContacts { get; }

    DbSet<KhataAuditLog> KhataAuditLogs { get; }

    DbSet<KhataCurrency> KhataCurrencies { get; }

    DbSet<KhataAttachment> KhataAttachments { get; }

    DbSet<KhataStoredFile> KhataStoredFiles { get; }

    DbSet<KhataLockSession> KhataLockSessions { get; }

    DbSet<KhataTransaction> KhataTransactions { get; }

    DbSet<KhataIdempotencyKey> KhataIdempotencyKeys { get; }

    DbSet<KhataNotificationLog> KhataNotificationLogs { get; }

    DbSet<KhataNotificationPref> KhataNotificationPrefs { get; }

    DbSet<KhataTransactionHistory> KhataTransactionHistory { get; }
}
