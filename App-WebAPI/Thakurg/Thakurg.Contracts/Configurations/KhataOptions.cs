namespace Thakurg.Contracts.Configurations;

public class KhataOptions
{
    public const string SectionName = "Khata";

    public KhataPinOptions Pin { get; set; } = new();

    public KhataLimitsOptions Limits { get; set; } = new();

    public KhataNewUserOptions NewUser { get; set; } = new();

    public KhataStorageOptions Storage { get; set; } = new();

    public KhataLocalFilesOptions LocalFiles { get; set; } = new();

    public KhataNotificationsOptions Notifications { get; set; } = new();
}
