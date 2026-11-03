namespace Thakurg.Contracts.Messages;

// One-time code login, mail and SMS sending, profile details and file exports.
public static partial class MessageCodes
{
    public const string AuthOtpSent = "AUTH_OTP_SENT";

    public const string AuthOtpInvalid = "AUTH_OTP_INVALID";

    public const string AuthOtpSmsText = "AUTH_OTP_SMS_TEXT";

    public const string EmailSendFailed = "EMAIL_SEND_FAILED";

    public const string SmsNotConfigured = "SMS_NOT_CONFIGURED";

    public const string AuthOtpEmailBody = "AUTH_OTP_EMAIL_BODY";

    public const string AuthOtpAppInvalid = "AUTH_OTP_APP_INVALID";

    public const string EmailNotConfigured = "EMAIL_NOT_CONFIGURED";

    public const string ProfileMobileTaken = "PROFILE_MOBILE_TAKEN";

    public const string OtpTooManyRequests = "OTP_TOO_MANY_REQUESTS";

    public const string ExportFormatInvalid = "EXPORT_FORMAT_INVALID";

    public const string ProfileDetailsSaved = "PROFILE_DETAILS_SAVED";

    public const string AuthOtpEmailSubject = "AUTH_OTP_EMAIL_SUBJECT";

    public const string ProfileDetailsInvalid = "PROFILE_DETAILS_INVALID";

    public const string AuthOtpDestinationInvalid = "AUTH_OTP_DESTINATION_INVALID";
}
