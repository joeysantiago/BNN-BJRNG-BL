using Thakurg.Domain.Common;

namespace Thakurg.Domain.Entities;

// Details of an account kept next to Users (1:1): mobile number (unique when set, used for SMS login), postal address and company.
public class UserProfile : BaseEntity
{
    public int Id { get; set; }

    public int UserId { get; set; }

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
