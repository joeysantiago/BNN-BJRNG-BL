using System.Globalization;

namespace Thakurg.Infrastructure.Common;

// Amounts are kept in minor units (paise, cents); a money type's Decimals say how many minor units make one.
public static class KhataMoney
{
    #region Public Methods

    public static decimal ToMajor(long amountMinor, int decimals)
    {
        return amountMinor / (decimal)Math.Pow(10, decimals);
    }

    public static string Format(long amountMinor, string symbol, int decimals)
    {
        return symbol + ToMajor(amountMinor, decimals).ToString("N" + decimals, CultureInfo.InvariantCulture);
    }

    #endregion
}
