namespace Thakurg.Contracts.Khata;

// KhataNotificationLog.Status. App messages stay Pending until a push provider sends them.
public enum KhataNotifyStatus : byte
{
    Pending = 0,
    Sent = 1,
    Failed = 2
}
