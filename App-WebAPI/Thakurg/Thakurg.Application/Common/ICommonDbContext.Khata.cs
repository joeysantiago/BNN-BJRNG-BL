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

    DbSet<KhataTransaction> KhataTransactions { get; }

    DbSet<KhataIdempotencyKey> KhataIdempotencyKeys { get; }

    DbSet<KhataTransactionHistory> KhataTransactionHistory { get; }
}
