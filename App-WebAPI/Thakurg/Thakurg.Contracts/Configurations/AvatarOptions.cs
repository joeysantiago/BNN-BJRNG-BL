namespace Thakurg.Contracts.Configurations;

// Profile pictures (Avatars in appsettings.json): the folder they are kept in (relative to the API's content root), the largest upload, and the allowed file types.
public class AvatarOptions
{
    public int MaxBytes { get; set; }

    public const string SectionName = "Avatars";

    public string Root { get; set; } = string.Empty;

    public List<string> Extensions { get; set; } = [];
}
