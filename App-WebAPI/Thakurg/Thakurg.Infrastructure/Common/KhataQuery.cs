using System.Globalization;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Common;

// Reads the entry-list query string (kind, sort, from / to as yyyy-MM-dd, q, page, pageSize) into a TransactionFilterDto.
// Any value it does not know is refused with KhataQueryInvalid rather than ignored.
public static class KhataQuery
{
    private const int MaxSearchLength = 100;

    public const string MonthFormat = "yyyy-MM";

    private const string DateFormat = "yyyy-MM-dd";

    private static readonly Dictionary<string, KhataEntrySort> Sorts = new(StringComparer.OrdinalIgnoreCase) { ["newest"] = KhataEntrySort.Newest, ["oldest"] = KhataEntrySort.Oldest, ["high"] = KhataEntrySort.High, ["low"] = KhataEntrySort.Low };

    private static readonly Dictionary<string, KhataEntryKind> Kinds = new(StringComparer.OrdinalIgnoreCase) { ["all"] = KhataEntryKind.All, ["gave"] = KhataEntryKind.Gave, ["got"] = KhataEntryKind.Got, ["photos"] = KhataEntryKind.Photos, ["deleted"] = KhataEntryKind.Deleted };

    #region Public Methods

    public static DateOnly? Date(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return DateOnly.TryParseExact(value.Trim(), DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : throw Invalid();
    }

    public static string Month(int year, int month)
    {
        return new DateOnly(year, month, 1).ToString(MonthFormat, CultureInfo.InvariantCulture);
    }

    public static TransactionFilterDto Filter(TransactionQueryDto query, KhataLimitsOptions limits)
    {
        var from = Date(query.From);
        var to = Date(query.To);
        var search = string.IsNullOrWhiteSpace(query.Q) ? null : query.Q.Trim();
        if (from > to || search?.Length > MaxSearchLength)
            throw Invalid();

        var pageSize = Math.Clamp(query.PageSize ?? limits.PageSize, 1, limits.MaxPageSize);

        return new TransactionFilterDto { Kind = Pick(query.Kind, Kinds, KhataEntryKind.All), Sort = Pick(query.Sort, Sorts, KhataEntrySort.Newest), From = from, To = to, Search = search, Page = Math.Clamp(query.Page ?? 1, 1, int.MaxValue / pageSize), PageSize = pageSize };
    }

    #endregion

    #region Private Methods

    private static BusinessException Invalid()
    {
        return new BusinessException(MessageCodes.KhataQueryInvalid, 400);
    }

    private static T Pick<T>(string? value, Dictionary<string, T> options, T fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
            return fallback;

        return options.TryGetValue(value.Trim(), out var picked) ? picked : throw Invalid();
    }

    #endregion
}
