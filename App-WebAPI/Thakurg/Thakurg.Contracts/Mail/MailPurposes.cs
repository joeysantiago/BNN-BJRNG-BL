namespace Thakurg.Contracts.Mail;

// What an e-mail is for, and so which mail server profile sends it: Otp = the sign-in codes, Notification = SnapKhata's notifications to parties.
public static class MailPurposes
{
    public const string Otp = "otp";

    public const string Notification = "notification";

    public static readonly string[] All = [Otp, Notification];
}
