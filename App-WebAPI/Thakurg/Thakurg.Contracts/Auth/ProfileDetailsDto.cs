namespace Thakurg.Contracts.Auth;

// GET / PUT api/auth/me/details: the user's mobile number, postal address and company. Every field is optional.
public class ProfileDetailsDto
{
    public string? City { get; set; }

    public string? State { get; set; }

    public string? Mobile { get; set; }

    public string? Country { get; set; }

    public string? PostalCode { get; set; }

    public string? CompanyName { get; set; }

    public string? AddressLine1 { get; set; }

    public string? AddressLine2 { get; set; }

    public string? CompanyEmail { get; set; }

    public string? CompanyPhone { get; set; }

    public string? CompanyTaxId { get; set; }

    public string? CompanyAddress { get; set; }
}
