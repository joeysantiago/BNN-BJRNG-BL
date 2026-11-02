using Thakurg.Contracts.Roles;

namespace Thakurg.Contracts.Auth;

// The Users tab of the Settings page: every app, every role (the role dropdown), and every user with their role and the apps they can open.
public class UserAccessDto
{
    public List<AppDto> Apps { get; set; } = [];

    public List<RoleDto> Roles { get; set; } = [];

    public List<UserDto> Users { get; set; } = [];
}
