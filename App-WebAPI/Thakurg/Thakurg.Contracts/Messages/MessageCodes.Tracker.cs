namespace Thakurg.Contracts.Messages;

// SnapTracker. Each code is a row of Common/001_Messages.sql (en, hi, ar).
public static partial class MessageCodes
{
    public const string TrackerAdded = "TRACKER_ADDED";

    public const string TrackerSaved = "TRACKER_SAVED";

    public const string TrackerDeleted = "TRACKER_DELETED";

    public const string TrackerIgnored = "TRACKER_IGNORED";

    public const string TrackerInvalid = "TRACKER_INVALID";

    public const string TrackerRestored = "TRACKER_RESTORED";

    public const string TrackerNotFound = "TRACKER_NOT_FOUND";

    public const string TrackerSmsEmpty = "TRACKER_SMS_EMPTY";

    public const string TrackerConfirmed = "TRACKER_CONFIRMED";

    public const string TrackerAlertsRead = "TRACKER_ALERTS_READ";

    public const string TrackerTrackingOn = "TRACKER_TRACKING_ON";

    public const string TrackerSmsTooLong = "TRACKER_SMS_TOO_LONG";

    public const string TrackerDataDeleted = "TRACKER_DATA_DELETED";

    public const string TrackerCategoryRule = "TRACKER_CATEGORY_RULE";

    public const string TrackerNotDuplicate = "TRACKER_NOT_DUPLICATE";

    public const string TrackerCategorySaved = "TRACKER_CATEGORY_SAVED";

    public const string TrackerSettingsSaved = "TRACKER_SETTINGS_SAVED";

    public const string TrackerTrackingPaused = "TRACKER_TRACKING_PAUSED";

    public const string TrackerTrackingResumed = "TRACKER_TRACKING_RESUMED";

    public const string TrackerTrackingRevoked = "TRACKER_TRACKING_REVOKED";

    public const string TrackerSmsTextsDeleted = "TRACKER_SMS_TEXTS_DELETED";
}
