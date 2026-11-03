namespace Thakurg.Contracts.Configurations;

// Khata:Notifications: how many party messages may wait in memory, and the longest error text kept in KhataNotificationLog.
public class KhataNotificationsOptions
{
    public int ErrorLength { get; set; }

    public int QueueCapacity { get; set; }
}
