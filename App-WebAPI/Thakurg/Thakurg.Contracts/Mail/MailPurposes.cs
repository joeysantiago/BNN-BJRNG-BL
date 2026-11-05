namespace Thakurg.Contracts.Mail;

// What an e-mail is for, and so which mail server profile sends it: Otp = the sign-in codes, Notification = SnapKhata's notifications to parties.
// Default = the site's own mail server (Settings > General): it sends any mail whose own profile is off. All lists every profile, Default first.
public static class MailPurposes
{
    public const string Otp = "otp";

    public const string Default = "default";

    public const string Notification = "notification";

    public static readonly string[] All = [Default, Otp, Notification];
}
