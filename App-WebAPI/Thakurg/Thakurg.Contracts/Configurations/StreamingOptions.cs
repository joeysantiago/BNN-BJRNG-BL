namespace Thakurg.Contracts.Configurations;

public class StreamingOptions
{
    public const string SectionName = "Streaming";

    public int PacketBytes { get; set; } = 524288;
}
