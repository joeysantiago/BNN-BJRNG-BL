namespace Thakurg.Contracts.Configurations;

public class SpeedTestOptions
{
    public const string SectionName = "SpeedTest";

    public long MaxDownloadBytes { get; set; } = 100_000_000;
}