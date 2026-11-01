using System.Text.RegularExpressions;

namespace Thakurg.Infrastructure.Common;

// One e-mail rule for the whole site (login and Khata contacts): trimmed, lower-cased, at most 256 characters, name@domain.tld.
public static class EmailAddress
{
    private const int MaxLength = 256;

    private static readonly Regex Pattern = new(@"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$", RegexOptions.Compiled);

    #region Public Methods

    public static string? Normalize(string? value)
    {
        var email = (value ?? string.Empty).Trim().ToLowerInvariant();

        return email.Length <= MaxLength && Pattern.IsMatch(email) ? email : null;
    }

    #endregion
}
