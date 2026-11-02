using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class RolePermission : BaseEntity
{
    public int Id { get; set; }

    public int PageId { get; set; }

    public int RoleId { get; set; }

    public bool CanAdd { get; set; }

    public bool CanEdit { get; set; }

    public bool CanView { get; set; }

    public bool CanDelete { get; set; }
}
