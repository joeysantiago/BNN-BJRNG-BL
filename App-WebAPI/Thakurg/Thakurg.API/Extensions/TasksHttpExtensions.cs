using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;

namespace Thakurg.API.Extensions;

// Who calls a My Tasks endpoint. The TaskUsers id is put in HttpContext.Items by TasksProfileFilter; the rest comes from the token of the common login.
public static class TasksHttpExtensions
{
    public const string ItemKey = "TaskUserId";

    #region Public Methods

    public static TaskCallerDto TaskCaller(this HttpContext context)
    {
        var caller = context.AuthCaller();

        return new TaskCallerDto { UserId = context.Items[ItemKey] is int id ? id : 0, AccountUserId = caller.UserId, SessionId = caller.SessionId, IsSuperAdmin = caller.RoleCode == RoleCodes.SuperAdmin };
    }

    #endregion
}
