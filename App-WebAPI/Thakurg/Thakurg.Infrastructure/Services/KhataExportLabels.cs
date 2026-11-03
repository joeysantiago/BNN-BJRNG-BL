namespace Thakurg.Infrastructure.Services;

// The words an entry export repeats on every row, read once per export.
public record KhataExportLabels(string Gave, string Got, string Active, string Deleted, string Total);
