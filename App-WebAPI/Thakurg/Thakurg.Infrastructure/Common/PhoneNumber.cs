namespace Thakurg.Infrastructure.Common;

// A mobile number as E.164 (+<country><number>), for one-time codes, profiles and WhatsApp. 10 digits (or 0 + 10, or 91 + 10) are taken as Indian (+91).
// Spaces, dashes and brackets are allowed; any other character makes it invalid (null).
public static class PhoneNumber
{
    #region Public Methods

    public static string? Normalize(string? value)
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
