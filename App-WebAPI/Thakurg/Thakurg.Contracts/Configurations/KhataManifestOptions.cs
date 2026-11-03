namespace Thakurg.Contracts.Configurations;

// Khata:Manifest: the SnapKhata web-app manifest. Id, StartUrl, Scope and the icon Src values are paths on the site (Site:PublicUrl); CacheSeconds is how long browsers keep it.
public class KhataManifestOptions
{
    public int CacheSeconds { get; set; }

    public string Id { get; set; } = string.Empty;

    public string Scope { get; set; } = string.Empty;

    public string Display { get; set; } = string.Empty;

    public string StartUrl { get; set; } = string.Empty;

    public string ThemeColor { get; set; } = string.Empty;

    public string Orientation { get; set; } = string.Empty;

    public string BackgroundColor { get; set; } = string.Empty;

    public List<KhataManifestIconOptions> Icons { get; set; } = [];
}
