namespace Thakurg.Contracts.Exceptions;

// A 429 that says how long to wait: the message gets the seconds as {0}, the response a Retry-After header and data { retryAfterSeconds }.
public class RetryAfterException : BusinessException
{
    public int RetryAfterSeconds { get; }

    public RetryAfterException(string code, int retryAfterSeconds) : base(code, 429, retryAfterSeconds)
    {
        RetryAfterSeconds = retryAfterSeconds;
    }
}
