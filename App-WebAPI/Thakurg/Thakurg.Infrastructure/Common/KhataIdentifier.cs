namespace Thakurg.Infrastructure.Common;

// Email and mobile rules for contacts: an email is lower-cased; a mobile number becomes E.164, and 10 digits (or 0 + 10) are taken as Indian (+91).
public static class KhataIdentifier
{
    #region Public Methods

    public static string? Email(string? value)
    {
        return EmailAddress.Normalize(value);
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


    #endregion
}
