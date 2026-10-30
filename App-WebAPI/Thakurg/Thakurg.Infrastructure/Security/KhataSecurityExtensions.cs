using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Security;

public static class KhataSecurityExtensions
{
    private const int MinimumSecretLength = 32;

    #region Public Methods

    // SnapKhata login: JWT bearer tokens checked against an active KhataSessions row. Policies: Session = logged in, Unlocked = PIN entered too.
    public static IServiceCollection AddKhataAuthentication(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddOptions<KhataOptions>().Bind(configuration.GetSection(KhataOptions.SectionName)).PostConfigure(options => UseDevelopmentSecrets(options, environment)).Validate(HasSecrets, "Khata:Jwt:Secret and Khata:Otp:HmacSecret must each be at least 32 characters (set them with dotnet user-secrets), and Khata:Otp:Sender must be Dev.").ValidateOnStart();
        services.AddAuthentication(KhataPolicies.Scheme).AddJwtBearer(KhataPolicies.Scheme, _ => { });
        services.AddOptions<JwtBearerOptions>(KhataPolicies.Scheme).Configure<IOptions<KhataOptions>>((bearer, khata) => ConfigureBearer(bearer, khata.Value));
        services.AddAuthorizationBuilder()
            .AddPolicy(KhataPolicies.Session, policy => policy.AddAuthenticationSchemes(KhataPolicies.Scheme).RequireAuthenticatedUser())
            .AddPolicy(KhataPolicies.Unlocked, policy => policy.AddAuthenticationSchemes(KhataPolicies.Scheme).RequireAuthenticatedUser().RequireClaim(KhataClaimTypes.Unlocked, "true"));

        return services;
    }

    #endregion

    #region Private Methods

    private static bool HasSecrets(KhataOptions options)
    {
        return options.Jwt.Secret.Length >= MinimumSecretLength && options.Otp.HmacSecret.Length >= MinimumSecretLength && options.Otp.Sender == "Dev";
    }

    // A logout, a PIN reset or a 10th wrong PIN revokes the session, so its access tokens stop working at once, not only when they expire.
    private static async Task ValidateSessionAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        var hasIds = int.TryParse(principal?.FindFirst(KhataClaimTypes.Subject)?.Value, out var userId) & int.TryParse(principal?.FindFirst(KhataClaimTypes.Session)?.Value, out var sessionId);
        var repository = context.HttpContext.RequestServices.GetRequiredService<IKhataAuthRepository>();
        if (!hasIds || !await repository.IsSessionActiveAsync(sessionId, userId, DateTime.UtcNow, context.HttpContext.RequestAborted))
            context.Fail(MessageCodes.KhataSessionInvalid);
    }

    private static void ConfigureBearer(JwtBearerOptions bearer, KhataOptions khata)
    {
        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = new TokenValidationParameters { ValidIssuer = khata.Jwt.Issuer, ValidAudience = khata.Jwt.Issuer, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(khata.Jwt.Secret)), NameClaimType = KhataClaimTypes.Subject, ClockSkew = TimeSpan.FromSeconds(30) };
        bearer.Events = new JwtBearerEvents
        {
            OnTokenValidated = ValidateSessionAsync,
            OnChallenge = context =>
            {
                context.HandleResponse();
                return WriteFailureAsync(context.HttpContext, StatusCodes.Status401Unauthorized, MessageCodes.KhataSessionInvalid);
            },
            OnForbidden = context => WriteFailureAsync(context.HttpContext, StatusCodes.Status403Forbidden, MessageCodes.KhataPinRequired)
        };
    }

    // Local development needs no setup: without configured secrets, random ones are made at startup (tokens then end when the API restarts).
    private static void UseDevelopmentSecrets(KhataOptions options, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            return;

        if (options.Jwt.Secret.Length < MinimumSecretLength)
            options.Jwt.Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

        if (options.Otp.HmacSecret.Length < MinimumSecretLength)
            options.Otp.HmacSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    }

    private static async Task WriteFailureAsync(HttpContext httpContext, int statusCode, string code)
    {
        var message = await httpContext.RequestServices.GetRequiredService<IMessageService>().GetAsync(code);
        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message));
    }

    #endregion
}
