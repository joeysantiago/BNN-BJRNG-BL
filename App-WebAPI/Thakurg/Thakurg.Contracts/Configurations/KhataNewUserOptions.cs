namespace Thakurg.Contracts.Configurations;

// Values a new SnapKhata user starts with (Khata:NewUser in appsettings.json).
public class KhataNewUserOptions
{
    public TimeOnly DailySummaryTime { get; set; }

    public string Language { get; set; } = string.Empty;

    public string TimeZone { get; set; } = string.Empty;
}
