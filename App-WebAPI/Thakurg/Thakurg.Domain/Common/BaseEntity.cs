namespace Thakurg.Domain.Common;

public abstract class BaseEntity
{
    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public int? CreatedBy { get; set; }

    public int? ModifiedBy { get; set; }

    public DateTime CreatedOn { get; set; }

    public bool IsSoftDeleted { get; set; }

    public DateTime? ModifiedOn { get; set; }
}
