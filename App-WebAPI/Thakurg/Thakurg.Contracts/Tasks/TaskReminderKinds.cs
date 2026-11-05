namespace Thakurg.Contracts.Tasks;

// What a reminder is about. Channels: only WhatsApp is sent by the server; the bell and device notifications are shown by the app itself.
public static class TaskReminderKinds
{
    public const string Due = "due";

    public const string Sent = "sent";

    public const string Failed = "failed";

    public const string Overdue = "overdue";

    public const string Upcoming = "upcoming";

    public const string WhatsApp = "whatsapp";
}
