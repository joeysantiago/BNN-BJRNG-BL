namespace Thakurg.Contracts.Auth;

// POST api/auth/register/code: the e-mail address of the new account and, when the code goes by WhatsApp or SMS (Settings > General), the mobile number.
public class SignupCodeRequestDto
{
    public string? Mobile { get; set; }

    public string Email { get; set; } = string.Empty;
}
