namespace Thakurg.Contracts.Roles;

// A page (Settings tab) that rights are given for. HasAdd / HasDelete: whether Add and Delete mean anything on it.
public class PageDto
{
    public int Id { get; set; }

    public bool HasAdd { get; set; }

    public bool HasDelete { get; set; }

    public string Code { get; set; } = string.Empty;
}
