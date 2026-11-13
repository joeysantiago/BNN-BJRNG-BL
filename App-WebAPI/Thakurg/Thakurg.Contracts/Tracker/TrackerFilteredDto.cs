namespace Thakurg.Contracts.Tracker;

// How many messages were ignored before anything was read further (Notice: reminders, statements and notices; Balance: balance-only messages).
public class TrackerFilteredDto
{
    public int Otp { get; set; }

    public int Other { get; set; }

    public int Promo { get; set; }

    public int Failed { get; set; }

    public int Notice { get; set; }

    public int Balance { get; set; }
}
