namespace Thakurg.Contracts.Tracker;

// How many messages were ignored before anything was read further.
public class TrackerFilteredDto
{
    public int Otp { get; set; }

    public int Other { get; set; }

    public int Promo { get; set; }

    public int Failed { get; set; }
}
