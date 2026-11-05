namespace Thakurg.Contracts.Lookups;

// One choice of a dropdown: its Id (to ask for the next list, such as the states of a country), its code, if it has one, and its name.
public class LookupItemDto
{
    public int Id { get; set; }

    public string? Code { get; set; }

    public string Name { get; set; } = string.Empty;
}
