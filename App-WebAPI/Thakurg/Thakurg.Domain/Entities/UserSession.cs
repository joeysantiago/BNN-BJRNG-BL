using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

public class UserSession : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? UserAgent { get; set; }

    public DateTime ExpiresOn { get; set; }

    public DateTime LoggedInOn { get; set; }

    public DateTime? RevokedOn { get; set; }

    public string DeviceId { get; set; } = string.Empty;

    public string LoginMethod { get; set; } = string.Empty;

    public string RefreshTokenHash { get; set; } = string.Empty;
}
