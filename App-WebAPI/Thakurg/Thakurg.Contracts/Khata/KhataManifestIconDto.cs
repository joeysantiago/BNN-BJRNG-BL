using System.Text.Json.Serialization;

namespace Thakurg.Contracts.Khata;

// One icon of the web-app manifest (W3C key names, so they are set here).
public class KhataManifestIconDto
{
    [JsonPropertyName("src")]
    public string Src { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("sizes")]
    public string Sizes { get; set; } = string.Empty;

    [JsonPropertyName("purpose")]
    public string Purpose { get; set; } = string.Empty;
}
