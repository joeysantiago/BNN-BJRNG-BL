using System.Text.Json.Serialization;

namespace Thakurg.Contracts.Apps;

// GET api/apps/{code}/manifest.webmanifest: the web-app manifest of one app. The W3C keys are snake_case, so they are set here instead of the camelCase default.
public class AppManifestDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("dir")]
    public string Dir { get; set; } = string.Empty;

    [JsonPropertyName("lang")]
    public string Lang { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("scope")]
    public string Scope { get; set; } = string.Empty;

    [JsonPropertyName("display")]
    public string Display { get; set; } = string.Empty;

    [JsonPropertyName("start_url")]
    public string StartUrl { get; set; } = string.Empty;

    [JsonPropertyName("short_name")]
    public string ShortName { get; set; } = string.Empty;

    [JsonPropertyName("theme_color")]
    public string ThemeColor { get; set; } = string.Empty;

    [JsonPropertyName("orientation")]
    public string Orientation { get; set; } = string.Empty;

    [JsonPropertyName("icons")]
    public List<AppManifestIconDto> Icons { get; set; } = [];

    [JsonPropertyName("background_color")]
    public string BackgroundColor { get; set; } = string.Empty;
}
