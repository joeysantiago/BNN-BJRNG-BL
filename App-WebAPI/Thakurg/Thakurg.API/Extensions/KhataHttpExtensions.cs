using Thakurg.API.Filters;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Khata;

namespace Thakurg.API.Extensions;

// HTTP plumbing for SnapKhata controllers: who is calling, as the Khata profile set by KhataProfileFilter plus the session and headers.
public static class KhataHttpExtensions
{
    #region Public Methods

    public static KhataCallerDto KhataCaller(this HttpContext context)
    {
        var userId = context.Items[KhataProfileFilter.ItemKey] is int id ? id : 0;
        var sessionId = int.TryParse(context.User.FindFirst(AuthClaimTypes.Session)?.Value, out var session) ? session : 0;

        return new KhataCallerDto { UserId = userId, SessionId = sessionId, Ip = context.Connection.RemoteIpAddress?.ToString(), UserAgent = context.Request.Headers.UserAgent.ToString(), DeviceId = context.Request.Headers[KhataHeaders.Device].ToString() };
    }

    #endregion
}
