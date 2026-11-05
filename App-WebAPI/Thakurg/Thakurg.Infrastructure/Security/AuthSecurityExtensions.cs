using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Security;

public static class AuthSecurityExtensions
{
    private const int MinimumSecretLength = 32;

    private static readonly string[] AllApps = [AppCodes.Hr, AppCodes.Creta, AppCodes.Khata, AppCodes.Nexon, AppCodes.Youtube, AppCodes.Tracker, AppCodes.Tasks];

    #region Public Methods

    // Administrators may open every app; everyone else only the apps ticked for them on the Users tab.
    public static bool HasApp(this ClaimsPrincipal user, string app)
    {
        return user.HasClaim(AuthClaimTypes.Admin, "true") || user.HasClaim(AuthClaimTypes.App, app);
    }

    // A super admin has every right; everyone else the rights of their role (RolePermissions).
    public static bool HasPermission(this ClaimsPrincipal user, string page, string action)
    {
        return user.HasClaim(AuthClaimTypes.Role, RoleCodes.SuperAdmin) || user.HasClaim(AuthClaimTypes.Permission, PermissionNames.Claim(page, action));
    }

    // The common login: JWT bearer tokens checked against an active UserSessions row. The role, its rights and app access come from the database, kept in memory
    // for Auth:SessionCacheSeconds (AuthSessionCache); a change on the Settings page clears it, so it applies at once. Policies: User = logged in, Admin, App:<code> = access to that app,
    // Perm:<page>:<action> = a right of the role on a Settings page (HasPermissionAttribute).
    public static IServiceCollection AddThakurgAuthentication(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddOptions<AuthOptions>().Bind(configuration.GetSection(AuthOptions.SectionName)).PostConfigure(options => UseDevelopmentSecret(options, environment)).Validate(IsValid, "Auth:Jwt:Secret must be at least 32 characters (set it with dotnet user-secrets), Auth:PasswordMinLength at least 8, Auth:Otp:CodeLength 4 to 9, Auth:Otp:Apps and Auth:Otp:PhoneEmailDomain set, and every other Auth number above 0.").ValidateOnStart();
        services.AddAuthentication(AuthPolicies.Scheme).AddJwtBearer(AuthPolicies.Scheme, _ => { });
        services.AddOptions<JwtBearerOptions>(AuthPolicies.Scheme).Configure<IOptions<AuthOptions>>((bearer, auth) => ConfigureBearer(bearer, auth.Value));
        var authorization = services.AddAuthorizationBuilder()
            .AddPolicy(AuthPolicies.User, policy => policy.AddAuthenticationSchemes(AuthPolicies.Scheme).RequireAuthenticatedUser())
            .AddPolicy(AuthPolicies.Admin, policy => policy.AddAuthenticationSchemes(AuthPolicies.Scheme).RequireAuthenticatedUser().RequireClaim(AuthClaimTypes.Admin, "true"))
            .AddPolicy(AuthPolicies.SuperAdminPassword, policy => policy.AddAuthenticationSchemes(AuthPolicies.Scheme).RequireAuthenticatedUser().RequireClaim(AuthClaimTypes.Role, RoleCodes.SuperAdmin).RequireClaim(AuthClaimTypes.Method, LoginMethods.Password));

        foreach (var app in AllApps)
            authorization.AddPolicy(AuthPolicies.AppPrefix + app, policy => policy.AddAuthenticationSchemes(AuthPolicies.Scheme).RequireAuthenticatedUser().RequireAssertion(context => context.User.HasApp(app)));

        foreach (var page in PageCodes.All)
            foreach (var action in PermissionActions.All)
                authorization.AddPolicy(PermissionNames.Policy(page, action), policy => policy.AddAuthenticationSchemes(AuthPolicies.Scheme).RequireAuthenticatedUser().RequireAssertion(context => context.User.HasPermission(page, action)));

        return services;
    }

    #endregion

    #region Private Methods

    private static bool IsValid(AuthOtpOptions otp)
    {
        return otp is { CodeLength: >= 4 and <= 9, CodeMinutes: > 0, MaxAttempts: > 0, ResendSeconds: > 0, MaxPerDestination: > 0, DestinationWindowMinutes: > 0, MaxPerDestinationPerDay: > 0, LockAfterFailedCodes: > 0, LockMinutes: > 0, IpLength: > 0, Apps.Count: > 0, PhoneEmailDomain.Length: > 0 };
    }

    private static bool IsValid(AuthOptions options)
    {
        return options.Jwt.Secret.Length >= MinimumSecretLength && options.Jwt is { AccessMinutes: > 0, RefreshDays: > 0 } && options is { PasswordMinLength: >= 8, MaxFailedLogins: > 0, LockoutMinutes: > 0, SessionCacheSeconds: > 0 } && IsValid(options.Otp);
    }

    // A logout or a password change ends the session, so its access tokens stop working at once, not only when they expire.
    // A session that did not log in with the password gets only the apps in Auth:Otp:Apps and no administrator rights (LoginMethodAccess).
    private static async Task ValidateSessionAsync(TokenValidatedContext context)
    {
        var identity = context.Principal?.Identity as ClaimsIdentity;
        var hasIds = int.TryParse(identity?.FindFirst(AuthClaimTypes.Subject)?.Value, out var userId) & int.TryParse(identity?.FindFirst(AuthClaimTypes.Session)?.Value, out var sessionId);
        var sessionCache = context.HttpContext.RequestServices.GetRequiredService<IAuthSessionCache>();
        var access = identity is not null && hasIds ? await sessionCache.GetAsync(sessionId, userId, context.HttpContext.RequestAborted) : null;

        if (identity is null || access is null)
        {
            context.Fail(MessageCodes.AuthSessionInvalid);
            return;
        }

        var otpApps = context.HttpContext.RequestServices.GetRequiredService<IOptions<AuthOptions>>().Value.Otp.Apps;
        access = LoginMethodAccess.Limit(access, identity.FindFirst(AuthClaimTypes.Method)?.Value, otpApps);

        identity.AddClaim(new Claim(AuthClaimTypes.Admin, access.IsAdmin ? "true" : "false"));
        identity.AddClaim(new Claim(AuthClaimTypes.Role, access.RoleCode));
        identity.AddClaims(access.Permissions.Select(right => new Claim(AuthClaimTypes.Permission, right)));
        identity.AddClaims(access.Apps.Select(code => new Claim(AuthClaimTypes.App, code)));
    }

    private static void ConfigureBearer(JwtBearerOptions bearer, AuthOptions auth)
    {
        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = new TokenValidationParameters { ValidIssuer = auth.Jwt.Issuer, ValidAudience = auth.Jwt.Issuer, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(auth.Jwt.Secret)), NameClaimType = AuthClaimTypes.Subject, ClockSkew = TimeSpan.FromSeconds(30) };
        bearer.Events = new JwtBearerEvents
        {
            OnMessageReceived = context => ReadCookieTokenAsync(context, auth),
            OnTokenValidated = ValidateSessionAsync,
            OnChallenge = context =>
            {
                context.HandleResponse();
                return WriteFailureAsync(context.HttpContext, StatusCodes.Status401Unauthorized, MessageCodes.AuthSessionInvalid);
            },
            OnForbidden = context => WriteFailureAsync(context.HttpContext, StatusCodes.Status403Forbidden, MessageCodes.AuthForbidden)
        };
    }

    // Audio, cover pictures and video streams are loaded by the browser from a plain URL (no Authorization header), so for GET requests
    // the access token may also come from the HttpOnly access cookie. Requests that change something always need the header.
    private static Task ReadCookieTokenAsync(MessageReceivedContext context, AuthOptions auth)
    {
        var request = context.Request;

        if (string.IsNullOrEmpty(request.Headers.Authorization) && (HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method)))
            context.Token = request.Cookies[auth.AccessCookie.Name];

        return Task.CompletedTask;
    }

    // Local development needs no setup: without a configured secret, a random one is made at startup (tokens then end when the API restarts).
    private static void UseDevelopmentSecret(AuthOptions options, IHostEnvironment environment)
    {
        if (environment.IsDevelopment() && options.Jwt.Secret.Length < MinimumSecretLength)
            options.Jwt.Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    }

    private static async Task WriteFailureAsync(HttpContext httpContext, int statusCode, string code)
    {
        var message = await httpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(code);
        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message));
    }

    #endregion
}
