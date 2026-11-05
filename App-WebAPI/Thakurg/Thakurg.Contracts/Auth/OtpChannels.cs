namespace Thakurg.Contracts.Auth;

// Where a one-time code is sent: to log in, or to check a new sign-up.
public static class OtpChannels
{
    public const string Sms = "sms";

    public const string Email = "email";

    public const string WhatsApp = "whatsapp";
}
