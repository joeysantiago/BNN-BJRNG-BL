using Thakurg.Contracts.Tracker;

namespace Thakurg.API.Extensions;

// Who calls a SnapTracker endpoint. The TrackerUsers id is put in HttpContext.Items by TrackerProfileFilter; the account comes from the token of the common login.
public static class TrackerHttpExtensions
{
    public const string ItemKey = "TrackerUserId";

    #region Public Methods

    public static TrackerCallerDto TrackerCaller(this HttpContext context)
    {
        return new TrackerCallerDto { UserId = context.Items[ItemKey] is int id ? id : 0, AccountUserId = context.AuthCaller().UserId };
    }

    #endregion
}
