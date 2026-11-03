using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// One mail server profile, entered by a super admin in Settings > Mail: Purpose = MailPurposes (otp or notification), Security = MailSecurityModes.
// PasswordProtected is the SMTP password, encrypted with ASP.NET Data Protection, never stored or returned in plain text.
public class MailSetting : BaseEntity
{
    public int Id { get; set; }

    public int Port { get; set; }

    public bool Enabled { get; set; }

    public string? Host { get; set; }

    public string? FromName { get; set; }

    public string? UserName { get; set; }

    public string? FromAddress { get; set; }

    public string? PasswordProtected { get; set; }

    public string Purpose { get; set; } = string.Empty;

    public string Security { get; set; } = string.Empty;
}
