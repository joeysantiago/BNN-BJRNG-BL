using Microsoft.AspNetCore.DataProtection;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Email;

// Mail server passwords in the database are encrypted with ASP.NET Data Protection, under their own purpose; the keys live outside the database.
public class MailSecretProtector : IMailSecretProtector
{
    private readonly IDataProtector _protector;

    private const string Purpose = "Thakurg.Mail.SmtpPassword.v1";

    public MailSecretProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector(Purpose);
    }

    #region Public Methods

    public string Protect(string secret)
    {
        return _protector.Protect(secret);
    }

    public string Unprotect(string protectedSecret)
    {
        return _protector.Unprotect(protectedSecret);
    }

    #endregion
}
