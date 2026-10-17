using System.Text.RegularExpressions;
using Thakurg.Contracts.Abstractions;

namespace Thakurg.Infrastructure.Common;

public static class PacketRange
{
    private static readonly Regex RangePattern = new(@"^bytes=(\d*)-(\d*)$", RegexOptions.Compiled);

    #region Public Methods

    public static FileStreamDto Apply(FileStreamDto file, string? rangeHeader, int packetBytes)
    {
        if (!file.Content.CanSeek || string.IsNullOrWhiteSpace(rangeHeader))
            return file;

        var total = file.Content.Length;
        var match = RangePattern.Match(rangeHeader.Split(',')[0].Trim());

        if (!match.Success || (match.Groups[1].Value.Length == 0 && match.Groups[2].Value.Length == 0))
            return file;

        var start = match.Groups[1].Value.Length == 0 ? Math.Max(0, total - long.Parse(match.Groups[2].Value)) : long.Parse(match.Groups[1].Value);
        var requestedEnd = match.Groups[1].Value.Length == 0 || match.Groups[2].Value.Length == 0 ? total - 1 : long.Parse(match.Groups[2].Value);

        if (start >= total)
        {
            file.Content.Dispose();
            file.Content = Stream.Null;
            file.IsUnsatisfiable = true;
            file.TotalLength = total;

            return file;
        }

        var end = Math.Min(Math.Min(requestedEnd, total - 1), start + packetBytes - 1);
        file.Content = new BoundedStream(file.Content, start, end - start + 1);
        file.IsPartial = true;
        file.TotalLength = total;
        file.RangeStart = start;
        file.RangeEnd = end;

        return file;
    }

    #endregion
}
