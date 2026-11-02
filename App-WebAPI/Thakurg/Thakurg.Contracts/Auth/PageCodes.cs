namespace Thakurg.Contracts.Auth;

// The pages (Settings tabs) that role rights are given for. Each code is a row in the Pages table (Common/013_Pages.sql).
public static class PageCodes
{
    public const string Json = "settings.json";

    public const string Roles = "settings.roles";

    public const string Users = "settings.users";

    public const string Account = "settings.account";

    public const string Youtube = "settings.youtube";

    public const string Features = "settings.features";

    public const string Services = "settings.services";

    public const string Connection = "settings.connection";

    public const string Permissions = "settings.permissions";

    public static readonly string[] All = [Account, Users, Roles, Permissions, Features, Connection, Services, Youtube, Json];
}
