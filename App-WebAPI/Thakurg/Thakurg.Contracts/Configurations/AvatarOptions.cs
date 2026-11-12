namespace Thakurg.Contracts.Configurations;

// Profile pictures (Avatars in appsettings.json): the app folder they are kept in (inside the file store of FileStorage), the largest upload, and the allowed file types.
public class AvatarOptions
{
    public int MaxBytes { get; set; }

    public const string SectionName = "Avatars";

    public List<string> Extensions { get; set; } = [];

    public string Folder { get; set; } = string.Empty;
}
