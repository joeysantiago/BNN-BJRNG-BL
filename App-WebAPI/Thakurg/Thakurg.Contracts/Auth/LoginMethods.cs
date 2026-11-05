namespace Thakurg.Contracts.Auth;

// How a session logged in (UserSessions.LoginMethod, claim AuthClaimTypes.Method). A one-time code session only opens the apps in Auth:Otp:Apps and never has administrator rights.
public static class LoginMethods
{
    public const string Otp = "otp";

    public const string Password = "password";
}
