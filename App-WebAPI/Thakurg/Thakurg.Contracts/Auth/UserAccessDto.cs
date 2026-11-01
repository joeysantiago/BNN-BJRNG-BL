namespace Thakurg.Contracts.Auth;

// The Users and access panel on the master page: every app, and every user with the apps they can open.
public class UserAccessDto
{
    public List<AppDto> Apps { get; set; } = [];

    public List<UserDto> Users { get; set; } = [];
}
