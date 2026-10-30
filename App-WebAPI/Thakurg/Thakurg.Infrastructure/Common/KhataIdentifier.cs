using System.Text.RegularExpressions;
using Thakurg.Contracts.Khata;

namespace Thakurg.Infrastructure.Common;

// Email and mobile rules shared by login (OTP) and contacts: an email is lower-cased; a mobile number becomes E.164, and 10 digits (or 0 + 10) are taken as Indian (+91).
public static class KhataIdentifier
{
    private const int MaxEmailLength = 256;

    private static readonly Regex EmailPattern = new(@"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$", RegexOptions.Compiled);

    #region Public Methods

    public static string? Email(string? value)
    {
        var email = (value ?? string.Empty).Trim().ToLowerInvariant();

        return email.Length <= MaxEmailLength && EmailPattern.IsMatch(email) ? email : null;
    }

    public static string? Mobile(string? value)
    {
        var text = (value ?? string.Empty).Trim();
        if (text.Any(c => !char.IsAsciiDigit(c) && c is not ('+' or ' ' or '-' or '(' or ')')))
            return null;

        var digits = new string(text.Where(char.IsAsciiDigit).ToArray());
        var mobile = text.StartsWith('+') ? "+" + digits : digits.Length switch
        {
            10 => "+91" + digits,
            11 when digits[0] == '0' => "+91" + digits[1..],
            12 when digits.StartsWith("91") => "+" + digits,
            _ => string.Empty
        };

        return mobile.Length is >= 9 and <= 16 ? mobile : null;
    }

    public static bool TryNormalize(string? value, out string identifier, out KhataOtpChannel channel)
    {
        channel = (value ?? string.Empty).Contains('@') ? KhataOtpChannel.Email : KhataOtpChannel.Sms;
        identifier = (channel == KhataOtpChannel.Email ? Email(value) : Mobile(value)) ?? string.Empty;

        return identifier.Length > 0;
    }

    #endregion
}
