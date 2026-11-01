namespace Thakurg.Contracts.Configurations;

public class HostingOptions
{
    public const string Azure = "Azure";

    public const string Local = "Local";

    public const string SectionName = "Hosting";

    /// <summary>Where the API runs: "Local" (your own machine or server) or "Azure" (App Service). Anything else stops the API at start.</summary>
    public string HostedOn { get; set; } = string.Empty;

    public bool IsAzure => string.Equals(HostedOn, Azure, StringComparison.OrdinalIgnoreCase);
}
