namespace Thakurg.Contracts.Auth;

// The options of their own pages a user switched off for themselves (feature codes such as "audio.doodle"). Only hides: an option switched off for the site stays off.
public class FeaturePreferencesDto
{
    public List<string> Hidden { get; set; } = [];
}
