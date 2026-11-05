namespace Thakurg.Contracts.Auth;

// Answer to a code request: how long the code works and how long to wait before asking for a new one.
public class OtpRequestDto
{
    public int ResendInSeconds { get; set; }

    public int ExpiresInSeconds { get; set; }
}
