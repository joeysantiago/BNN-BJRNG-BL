namespace Thakurg.Contracts.Auth;

public class UserAccessUpdateDto
{
    public bool IsAdmin { get; set; }

    public List<string> Apps { get; set; } = [];
}
