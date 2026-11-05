namespace Thakurg.Contracts.Configurations;

// Tasks:Reminders: how often the server looks for WhatsApp reminders to send, and how many days ahead "upcoming" reaches.
public class TasksRemindersOptions
{
    public int UpcomingDays { get; set; }

    public int IntervalSeconds { get; set; }
}
