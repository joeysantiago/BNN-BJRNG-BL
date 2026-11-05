namespace Thakurg.Contracts.Settings;

// PUT api/settings/signup-verification: where the code that checks a new sign-up goes (OtpChannels: email, whatsapp or sms).
public class SignupVerificationUpdateDto
{
    public string Channel { get; set; } = string.Empty;
}
