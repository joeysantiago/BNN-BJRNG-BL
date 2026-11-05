namespace Thakurg.Contracts.Settings;

// The name of one app per language code (en, hi, ar): its rows of the PageNames table, read by the header, the footer, the Settings page and the install manifest.
public class AppNameUpdateDto
{
    public Dictionary<string, string> Names { get; set; } = [];
}
