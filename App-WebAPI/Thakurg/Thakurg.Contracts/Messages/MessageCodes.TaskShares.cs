namespace Thakurg.Contracts.Messages;

// Sharing tasks (Tasks). Each code is a row of Common/001_Messages.sql (en, hi, ar).
public static partial class MessageCodes
{
    public const string TasksShared = "TASKS_SHARED";

    public const string TasksShareLeft = "TASKS_SHARE_LEFT";

    public const string TasksShareSelf = "TASKS_SHARE_SELF";

    public const string TasksShareNoApp = "TASKS_SHARE_NO_APP";

    public const string TasksShareRemoved = "TASKS_SHARE_REMOVED";

    public const string TasksShareAccepted = "TASKS_SHARE_ACCEPTED";

    public const string TasksShareDeclined = "TASKS_SHARE_DECLINED";

    public const string TasksShareNotFound = "TASKS_SHARE_NOT_FOUND";

    public const string TasksShareReadOnly = "TASKS_SHARE_READ_ONLY";

    public const string TasksShareNoAccount = "TASKS_SHARE_NO_ACCOUNT";

    public const string TasksShareTargetInvalid = "TASKS_SHARE_TARGET_INVALID";
}
