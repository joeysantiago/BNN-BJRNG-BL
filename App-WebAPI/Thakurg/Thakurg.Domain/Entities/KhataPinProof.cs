using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class KhataPinProof : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public byte Purpose { get; set; }

    public int SessionId { get; set; }

    public int? TargetId { get; set; }

    public DateTime? UsedOn { get; set; }

    public DateTime ExpiresOn { get; set; }

    public string ProofHash { get; set; } = string.Empty;
}
