using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class UserAppAccess : BaseEntity
{
    public int Id { get; set; }

    public int AppId { get; set; }

    public int UserId { get; set; }
}
