namespace Thakurg.Contracts.Configurations;

// AppManifests in appsettings.json: the web-app manifest of every app that installs on its own, keyed by app code (khata, creta, nexon).
// Each branch lists only the apps it holds; CacheSeconds is how long browsers keep a manifest.
public class AppManifestOptions
{
    public int CacheSeconds { get; set; }

    public const string SectionName = "AppManifests";

    public Dictionary<string, AppManifestAppOptions> Apps { get; set; } = new();
}
