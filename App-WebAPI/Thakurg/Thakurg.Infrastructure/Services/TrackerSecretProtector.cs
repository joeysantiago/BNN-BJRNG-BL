using Microsoft.AspNetCore.DataProtection;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Services;

// The original SMS texts of SnapTracker are encrypted with ASP.NET Data Protection, under their own purpose; the keys live outside the database.
public class TrackerSecretProtector : ITrackerSecretProtector
{
    private readonly IDataProtector _protector;

    private const string Purpose = "Thakurg.Tracker.SmsText.v1";

    public TrackerSecretProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector(Purpose);
    }

    #region Public Methods

    public string Protect(string text)
    {
        return _protector.Protect(text);
    }

    public string Unprotect(string protectedText)
    {
        return _protector.Unprotect(protectedText);
    }

    #endregion
}
