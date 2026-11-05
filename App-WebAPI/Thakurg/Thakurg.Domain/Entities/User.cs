using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class User : BaseEntity
{
    public int Id { get; set; }

    public int RoleId { get; set; }

    public bool ShowOnLogin { get; set; }

    public string? AvatarFile { get; set; }

    public int FailedLoginCount { get; set; }

    public DateTime? LastLoginOn { get; set; }

    public DateTime? LockedUntil { get; set; }

    public string Email { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;
}
