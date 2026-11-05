namespace Thakurg.Contracts.Tasks;

// The name of the app per language code (en, hi, ar): the "tasks" rows of the PageNames table, read by the header, the dashboard, the settings and the install manifest.
public class TaskAppNameRequestDto
{
    public Dictionary<string, string> Names { get; set; } = [];
}
