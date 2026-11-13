namespace Thakurg.Contracts.Tracker;

// Who the user is in an SMS: the names banks write ("Kunal Kumar") and the mobile numbers in their UPI ids ("9540000677@…"). Money to or from them is a self
// transfer, and an employer's "credited to <name>" notice is an echo of a salary already counted.
public class TrackerOwnerDto
{
    public List<string> Names { get; set; } = [];

    public List<string> Mobiles { get; set; } = [];
}
