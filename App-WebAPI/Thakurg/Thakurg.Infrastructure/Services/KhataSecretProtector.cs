using Microsoft.AspNetCore.DataProtection;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Services;

// Secrets kept in the database are encrypted with ASP.NET Data Protection; the keys live outside the database (the host's key ring).
public class KhataSecretProtector : IKhataSecretProtector
{
    private readonly IDataProtector _protector;

    private const string Purpose = "Thakurg.Khata.StorageSecret.v1";

    public KhataSecretProtector(IDataProtectionProvider provider)
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
