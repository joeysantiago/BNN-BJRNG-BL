using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;

namespace Thakurg.API.Extensions;

// HTTP plumbing for the common login: who is calling (from the token and headers) and the two HttpOnly cookies.
// The refresh cookie only travels to /api/auth; the access cookie lets the browser load audio, pictures and video streams by URL (GET only).
public static class AuthHttpExtensions
{
    private const string DeviceHeader = "X-Device";

    #region Public Methods

    public static AuthCallerDto AuthCaller(this HttpContext context)
    {
        return new AuthCallerDto { UserId = ClaimAsInt(context, AuthClaimTypes.Subject), SessionId = ClaimAsInt(context, AuthClaimTypes.Session), Ip = context.Connection.RemoteIpAddress?.ToString(), UserAgent = context.Request.Headers.UserAgent.ToString(), DeviceId = context.Request.Headers[DeviceHeader].ToString() };
    }

    public static void DeleteAuthCookies(this HttpResponse response, AuthOptions auth)
    {
        response.Cookies.Delete(auth.AccessCookie.Name, BuildCookie(auth.AccessCookie, null));
        response.Cookies.Delete(auth.RefreshCookie.Name, BuildCookie(auth.RefreshCookie, null));
    }

    public static void WriteAuthCookies(this HttpResponse response, AuthOptions auth, SignInDto signIn)
    {
        response.Cookies.Append(auth.AccessCookie.Name, signIn.Auth.AccessToken, BuildCookie(auth.AccessCookie, DateTime.UtcNow.AddSeconds(signIn.Auth.ExpiresInSeconds)));
        response.Cookies.Append(auth.RefreshCookie.Name, signIn.RefreshToken, BuildCookie(auth.RefreshCookie, signIn.RefreshExpiresOn));
    }

    #endregion

    #region Private Methods

    private static int ClaimAsInt(HttpContext context, string type)
    {
        return int.TryParse(context.User.FindFirst(type)?.Value, out var value) ? value : 0;
    }

    private static CookieOptions BuildCookie(AuthCookieOptions cookie, DateTime? expiresOn)
    {
        return new CookieOptions { HttpOnly = true, Secure = true, IsEssential = true, Path = cookie.Path, Expires = expiresOn, SameSite = Enum.Parse<SameSiteMode>(cookie.SameSite, true) };
    }

    #endregion
}
