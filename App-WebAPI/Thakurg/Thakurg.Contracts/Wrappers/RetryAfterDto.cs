namespace Thakurg.Contracts.Wrappers;

// Data of a 429 answer: the seconds to wait before trying again.
public class RetryAfterDto
{
    public int RetryAfterSeconds { get; set; }
}
