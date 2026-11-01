using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataContact : BaseEntity
{
    public int Id { get; set; }

    public int BookId { get; set; }

    public string? Note { get; set; }

    public string? Email { get; set; }

    public string? Mobile { get; set; }

    public int OwnerUserId { get; set; }

    public string? Address { get; set; }

    public byte ContactType { get; set; }

    public byte ShareStatus { get; set; }

    public DateOnly? DueDate { get; set; }

    public int? LinkedUserId { get; set; }

    public long BalanceMinor { get; set; }

    public byte[] RowVersion { get; set; } = [];

    public DateTime? LastReminderOn { get; set; }

    public bool AllowContactEntries { get; set; }

    public DateTime? ShareRespondedOn { get; set; }

    public string Name { get; set; } = string.Empty;
}
