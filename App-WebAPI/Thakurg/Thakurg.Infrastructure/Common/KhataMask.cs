namespace Thakurg.Infrastructure.Common;

// Hides most of an email address or mobile number before it is written to a log (design S7).
public static class KhataMask
{
    private const string Hidden = "•••";

    #region Public Methods

    public static string Identifier(string value)
    {
        var at = value.IndexOf('@');
        if (at > 0)
            return value[..Math.Min(2, at)] + Hidden + value[at..];

        return value.Length <= 8 ? Hidden : value[..5] + Hidden + value[^3..];
    }

    #endregion
}
