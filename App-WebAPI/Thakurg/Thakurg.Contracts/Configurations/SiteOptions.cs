namespace Thakurg.Contracts.Configurations;

// Site in appsettings.json: the public address of the web site (the Angular app), for absolute links the API hands out (the web-app manifest).
public class SiteOptions
{
    public const string SectionName = "Site";

    public string PublicUrl { get; set; } = string.Empty;
}
