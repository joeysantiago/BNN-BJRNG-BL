namespace Thakurg.Contracts.Configurations;

public class KhataCookieOptions
{
    public string Name { get; set; } = "khata_rt";

    public string SameSite { get; set; } = "None";

    public string Path { get; set; } = "/api/khata/auth";
}
