namespace Thakurg.Contracts.Configurations;

public class ProxyOptions
{
    public bool Enabled { get; set; }

    public const string SectionName = "Proxy";

    public int ForwardLimit { get; set; } = 1;

    public string[] KnownProxies { get; set; } = Array.Empty<string>();

    public string[] KnownNetworks { get; set; } = Array.Empty<string>();
}
