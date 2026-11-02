using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class UserFeature : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int FeatureId { get; set; }

    public bool IsEnabled { get; set; }
}
