namespace Thakurg.Domain.Common;

public abstract class BaseEntity
{
    public bool IsDeleted { get; set; }

    public int? CreatedBy { get; set; }

    public int? ModifiedBy { get; set; }

    public bool IsSoftDeleted { get; set; }

    public DateTime? ModifiedOn { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
