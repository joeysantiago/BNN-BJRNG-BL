namespace Thakurg.Contracts.Khata;

// GET / PUT api/khata/settings: the user's own SnapKhata settings and where new bill photos are kept (site-wide, read only here).
public class KhataSettingsDto
{
    public bool NotificationsEnabled { get; set; }

    public KhataStorageInfoDto Storage { get; set; } = new();
}
