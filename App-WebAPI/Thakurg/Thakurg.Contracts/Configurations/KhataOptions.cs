namespace Thakurg.Contracts.Configurations;

public class KhataOptions
{
    public const string SectionName = "Khata";

    public KhataLimitsOptions Limits { get; set; } = new();

    public KhataNewUserOptions NewUser { get; set; } = new();
}
