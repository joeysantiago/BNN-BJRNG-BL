namespace Thakurg.Contracts.Configurations;

// One app under AppManifests:Apps. Id, StartUrl, Scope and the icon Src values are paths on the site (Site:PublicUrl).
public class AppManifestAppOptions
{
    public string Id { get; set; } = string.Empty;

    public string Scope { get; set; } = string.Empty;

    public string Display { get; set; } = string.Empty;

    public string StartUrl { get; set; } = string.Empty;

    public string ThemeColor { get; set; } = string.Empty;

    public string Orientation { get; set; } = string.Empty;

    public string BackgroundColor { get; set; } = string.Empty;

    public List<AppManifestIconOptions> Icons { get; set; } = [];
}
