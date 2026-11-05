namespace Thakurg.Contracts.Configurations;

// Profile:Limits: the longest text each profile detail may have. The UI gets the same numbers with GET api/auth/me/details (ProfileLimitsDto).
public class ProfileLimitsOptions
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
