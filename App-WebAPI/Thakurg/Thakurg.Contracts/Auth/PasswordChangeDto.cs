namespace Thakurg.Contracts.Auth;

public class PasswordChangeDto
{
    public string NewPassword { get; set; } = string.Empty;

    public string CurrentPassword { get; set; } = string.Empty;
}
