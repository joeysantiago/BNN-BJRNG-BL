using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;

namespace Thakurg.API.Extensions;

// HTTP plumbing for SnapKhata controllers: who is calling (from the token and headers) and the HttpOnly refresh-token cookie.
public static class KhataHttpExtensions
{
    private const string DeviceHeader = "X-Khata-Device";

    #region Public Methods

    public static KhataCallerDto KhataCaller(this HttpContext context)
    {
        return new KhataCallerDto { UserId = ClaimAsInt(context, KhataClaimTypes.Subject), SessionId = ClaimAsInt(context, KhataClaimTypes.Session), Ip = context.Connection.RemoteIpAddress?.ToString(), UserAgent = context.Request.Headers.UserAgent.ToString(), DeviceId = context.Request.Headers[DeviceHeader].ToString() };
    }

    public static void DeleteKhataRefreshCookie(this HttpResponse response, KhataCookieOptions cookie)
    {
        response.Cookies.Delete(cookie.Name, BuildCookie(cookie, null));
    }

    public static void WriteKhataRefreshCookie(this HttpResponse response, KhataCookieOptions cookie, KhataSignInDto signIn)
    {
        response.Cookies.Append(cookie.Name, signIn.RefreshToken, BuildCookie(cookie, signIn.RefreshExpiresOn));
    }

    #endregion

    #region Private Methods

    private static int ClaimAsInt(HttpContext context, string type)
    {
        return int.TryParse(context.User.FindFirst(type)?.Value, out var value) ? value : 0;
    }

    private static CookieOptions BuildCookie(KhataCookieOptions cookie, DateTime? expiresOn)
    {
        return new CookieOptions { HttpOnly = true, Secure = true, IsEssential = true, Path = cookie.Path, Expires = expiresOn, SameSite = Enum.Parse<SameSiteMode>(cookie.SameSite, true) };
    }

    #endregion
}
