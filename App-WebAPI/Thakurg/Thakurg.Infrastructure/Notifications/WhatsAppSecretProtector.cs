using Microsoft.AspNetCore.DataProtection;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Notifications;

// The WhatsApp access token in the database is encrypted with ASP.NET Data Protection, under its own purpose; the keys live outside the database.
public class WhatsAppSecretProtector : IWhatsAppSecretProtector
{
    private readonly IDataProtector _protector;

    private const string Purpose = "Thakurg.WhatsApp.AccessToken.v1";

    public WhatsAppSecretProtector(IDataProtectionProvider provider)
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
