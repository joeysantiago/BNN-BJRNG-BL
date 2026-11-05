namespace Thakurg.Contracts.Auth;

// POST api/auth/register: the account, and the one-time code sent by POST api/auth/register/code (to the e-mail address, or to the mobile number for WhatsApp or SMS).
public class RegisterRequestDto
{
    public string? Mobile { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
}
