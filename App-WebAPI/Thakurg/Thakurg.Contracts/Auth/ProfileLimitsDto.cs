namespace Thakurg.Contracts.Auth;

// The longest text each profile detail may have (Profile:Limits), for the UI's maxlength attributes.
public class ProfileLimitsDto
{
    public int CityLength { get; set; }

    public int StateLength { get; set; }

    public int MobileLength { get; set; }

    public int AddressLength { get; set; }

    public int CountryLength { get; set; }

    public int PostalCodeLength { get; set; }

    public int CompanyNameLength { get; set; }

    public int CompanyEmailLength { get; set; }

    public int CompanyPhoneLength { get; set; }

    public int CompanyTaxIdLength { get; set; }

    public int CompanyAddressLength { get; set; }
}
