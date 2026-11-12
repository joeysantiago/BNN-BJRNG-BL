namespace Thakurg.Contracts.Configurations;

// Khata in appsettings.json. Folder is the folder bill and contact photos are kept in, inside the file store of FileStorage (App-Data/khata or <env>/khata).
public class KhataOptions
{
    public const string SectionName = "Khata";

    public KhataPinOptions Pin { get; set; } = new();

    public string Folder { get; set; } = string.Empty;

    public KhataLimitsOptions Limits { get; set; } = new();

    public KhataNewUserOptions NewUser { get; set; } = new();

    public KhataNotificationsOptions Notifications { get; set; } = new();
}
