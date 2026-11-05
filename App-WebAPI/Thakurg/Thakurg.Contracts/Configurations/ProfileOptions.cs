namespace Thakurg.Contracts.Configurations;

// Profile in appsettings.json: the profile details (UserProfiles) rules.
public class ProfileOptions
{
    public const string SectionName = "Profile";

    public ProfileLimitsOptions Limits { get; set; } = new();
}
