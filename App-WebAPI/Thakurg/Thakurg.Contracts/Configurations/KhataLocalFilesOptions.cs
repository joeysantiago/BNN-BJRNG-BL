namespace Thakurg.Contracts.Configurations;

// Khata:LocalFiles in appsettings.json: the folder bill photos are kept in (relative to the API's content root), App-Data/khata, never committed.
public class KhataLocalFilesOptions
{
    public string Root { get; set; } = string.Empty;
}
