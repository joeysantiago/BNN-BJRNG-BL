using Microsoft.Extensions.Options;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// The common login: e-mail + password sign-up and login, refresh-token sessions, profile, password change and the user's own page options.
public class AuthService : IAuthService
{
    private const int DeviceIdLength = 64;

    private readonly AuthOptions _options;

    private const int UserAgentLength = 300;

    private const int MaxPasswordLength = 128;

    private const int MaxDisplayNameLength = 100;

    private readonly IAuthRepository _authRepository;

    private readonly IAuthSessionCache _sessionCache;

    private readonly IAuthTokenService _tokenService;

    private readonly IMessageService _messageService;

    private readonly IPasswordHasher _passwordHasher;

    private static readonly string[] Languages = ["en", "hi", "ar"];

    // The options a user may switch off for themselves, by code prefix, and the apps that make them "their own": none = every user (header, speed test).
    // Page switches (page.*) are not listed: they stay with the site settings.
    private static readonly Dictionary<string, string[]> OwnFeatureApps = new() { ["site."] = [], ["speed."] = [], ["yt."] = [AppCodes.Youtube], ["audio."] = [AppCodes.Creta, AppCodes.Nexon] };

    public AuthService(IOptions<AuthOptions> options, IAuthTokenService tokenService, IPasswordHasher passwordHasher, IMessageService messageService, IAuthRepository authRepository, IAuthSessionCache sessionCache)
    {
        _options = options.Value;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _messageService = messageService;
        _authRepository = authRepository;
        _sessionCache = sessionCache;
    }

    #region Public Methods

    public async Task<UserDto> GetMeAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(userId, cancellationToken);

        return await BuildUserAsync(user, cancellationToken);
    }

    public async Task<string> LogoutAsync(AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var session = await _authRepository.GetSessionAsync(caller.SessionId, cancellationToken);

        if (session is not null && session.UserId == caller.UserId)
        {
            session.RevokedOn = DateTime.UtcNow;
            session.ModifiedOn = session.RevokedOn;
            await _authRepository.SaveChangesAsync(cancellationToken);
            _sessionCache.Forget(caller.UserId);
        }

        return await _messageService.GetAsync(MessageCodes.AuthLoggedOut);
    }

    // Every app open starts here: the refresh token is rotated and a new access token is issued.
    public async Task<SignInDto> RefreshAsync(string? refreshToken, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);

        var now = DateTime.UtcNow;
        var session = await _authRepository.GetSessionByTokenAsync(_tokenService.Hash(refreshToken), cancellationToken);

        if (session is null || session.RevokedOn is not null || session.ExpiresOn <= now)
            throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);

        var user = await RequireUserAsync(session.UserId, cancellationToken);
        var newToken = _tokenService.NewSecret();
        session.RefreshTokenHash = _tokenService.Hash(newToken);
        session.ExpiresOn = now.AddDays(_options.Jwt.RefreshDays);
        session.ModifiedOn = now;
        await _authRepository.SaveChangesAsync(cancellationToken);
        var dto = await BuildUserAsync(user, cancellationToken);

        return new SignInDto { Auth = _tokenService.CreateResult(dto, session.Id), RefreshToken = newToken, RefreshExpiresOn = session.ExpiresOn };
    }

    // A wrong password counts towards the lockout; the same message is used for an unknown e-mail, so it does not reveal which addresses exist.
    public async Task<SignInDto> LoginAsync(LoginRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var email = EmailAddress.Normalize(request.Email);
        var user = email is null ? null : await _authRepository.FindByEmailAsync(email, cancellationToken);

        if (user is null)
            throw new BusinessException(MessageCodes.AuthLoginInvalid, 401);

        if (user.LockedUntil > now)
            throw new BusinessException(MessageCodes.AuthLocked, 423, (int)Math.Ceiling((user.LockedUntil.Value - now).TotalMinutes));

        if (!_passwordHasher.Verify(request.Password ?? string.Empty, user.PasswordHash))
        {
            user.FailedLoginCount++;
            user.LockedUntil = user.FailedLoginCount >= _options.MaxFailedLogins ? now.AddMinutes(_options.LockoutMinutes) : null;
            user.FailedLoginCount = user.LockedUntil is null ? user.FailedLoginCount : 0;
            await _authRepository.SaveChangesAsync(cancellationToken);
            throw new BusinessException(MessageCodes.AuthLoginInvalid, 401);
        }

        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        user.LastLoginOn = now;

        return await StartSessionAsync(user, caller, now, cancellationToken);
    }

    // Self sign-up: the account gets the sign-up role (Roles.IsDefault, the Standard User) and the apps marked AutoGrant (Khata, SnapTracker); the others wait for an administrator.
    // An e-mail listed in Auth:AdminEmails signs up as a super admin with every app.
    public async Task<SignInDto> RegisterAsync(RegisterRequestDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var email = EmailAddress.Normalize(request.Email) ?? throw new BusinessException(MessageCodes.AuthEmailInvalid, 400);

        if (await _authRepository.FindByEmailAsync(email, cancellationToken) is not null)
            throw new BusinessException(MessageCodes.AuthEmailTaken, 409);

        var now = DateTime.UtcNow;
        var isOwner = _options.AdminEmails.Any(a => string.Equals(a.Trim(), email, StringComparison.OrdinalIgnoreCase));
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email[..email.IndexOf('@')] : request.DisplayName.Trim();

        if (displayName.Length > MaxDisplayNameLength)
            throw new BusinessException(MessageCodes.AuthProfileInvalid, 400, MaxDisplayNameLength);

        var role = (isOwner ? await _authRepository.GetRoleByCodeAsync(RoleCodes.SuperAdmin, cancellationToken) : await _authRepository.GetDefaultRoleAsync(cancellationToken)) ?? throw new BusinessException(MessageCodes.RoleNotFound, 500);
        var user = new User { Email = email, PasswordHash = HashNewPassword(request.Password), DisplayName = displayName, Language = Languages[0], RoleId = role.Id, LastLoginOn = now };
        await _authRepository.AddUserAsync(user, cancellationToken);
        var apps = isOwner ? await _authRepository.GetAllAppsAsync(cancellationToken) : await _authRepository.GetAutoGrantAppsAsync(cancellationToken);
        await _authRepository.AddAccessAsync(apps.Select(a => new UserAppAccess { UserId = user.Id, AppId = a.Id, CreatedBy = user.Id }), cancellationToken);

        return await StartSessionAsync(user, caller, now, cancellationToken);
    }

    // The other sessions of the user end, so a changed password logs out every other device.
    public async Task<string> ChangePasswordAsync(PasswordChangeDto request, AuthCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(caller.UserId, cancellationToken);

        if (!_passwordHasher.Verify(request.CurrentPassword ?? string.Empty, user.PasswordHash))
            throw new BusinessException(MessageCodes.AuthPasswordWrong, 400);

        var now = DateTime.UtcNow;
        user.PasswordHash = HashNewPassword(request.NewPassword);
        user.ModifiedBy = user.Id;
        user.ModifiedOn = now;
        await _authRepository.SaveChangesAsync(cancellationToken);
        await _authRepository.RevokeSessionsAsync(user.Id, caller.SessionId, now, cancellationToken);
        _sessionCache.Forget(user.Id);

        return await _messageService.GetAsync(MessageCodes.AuthPasswordChanged);
    }

    public async Task<ServiceResultDto<UserDto>> UpdateProfileAsync(int userId, ProfileUpdateDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(userId, cancellationToken);
        var displayName = (request.DisplayName ?? string.Empty).Trim();

        if (displayName.Length is 0 or > MaxDisplayNameLength || !Languages.Contains(request.Language))
            throw new BusinessException(MessageCodes.AuthProfileInvalid, 400, MaxDisplayNameLength);

        user.DisplayName = displayName;
        user.Language = request.Language;
        user.ModifiedBy = user.Id;
        user.ModifiedOn = DateTime.UtcNow;
        await _authRepository.SaveChangesAsync(cancellationToken);
        var dto = await BuildUserAsync(user, cancellationToken);

        return new ServiceResultDto<UserDto> { Data = dto, Message = await _messageService.GetAsync(MessageCodes.AuthProfileSaved) };
    }

    // The options of their own pages the user switched off for themselves. Only options of the header, the speed test and the apps they can open are accepted.
    public async Task<ServiceResultDto<UserDto>> UpdateFeaturesAsync(int userId, FeaturePreferencesDto request, CancellationToken cancellationToken)
    {
        var user = await RequireUserAsync(userId, cancellationToken);
        var dto = await BuildUserAsync(user, cancellationToken);
        var features = await _authRepository.GetFeaturesAsync(cancellationToken);
        var codes = (request.Hidden ?? []).Distinct().ToList();
        var unknown = codes.FirstOrDefault(c => !IsOwnFeature(c, dto) || features.All(f => f.Code != c));

        if (unknown is not null)
            throw new BusinessException(MessageCodes.AuthFeatureUnknown, 400, unknown);

        await _authRepository.ReplaceHiddenFeaturesAsync(user.Id, features.Where(f => codes.Contains(f.Code)).Select(f => f.Id).ToList(), cancellationToken);
        await _authRepository.SaveChangesAsync(cancellationToken);
        dto.HiddenFeatures = codes;

        return new ServiceResultDto<UserDto> { Data = dto, Message = await _messageService.GetAsync(MessageCodes.AuthFeaturesSaved) };
    }

    #endregion

    #region Private Methods

    private string HashNewPassword(string? password)
    {
        if (password is null || password.Length < _options.PasswordMinLength || password.Length > MaxPasswordLength)
            throw new BusinessException(MessageCodes.AuthPasswordWeak, 400, _options.PasswordMinLength);

        return _passwordHasher.Hash(password);
    }

    private static string? Truncate(string? value, int length)
    {
        return value is { Length: > 0 } text ? text[..Math.Min(text.Length, length)] : null;
    }

    private static bool IsOwnFeature(string code, UserDto user)
    {
        var apps = OwnFeatureApps.FirstOrDefault(p => code.StartsWith(p.Key, StringComparison.Ordinal)).Value;

        return apps is not null && (apps.Length == 0 || user.IsAdmin || apps.Any(user.Apps.Contains));
    }

    private async Task<User> RequireUserAsync(int userId, CancellationToken cancellationToken)
    {
        return await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    // The account as the site sees it: role, the role's rights, apps and the options the user switched off.
    private async Task<UserDto> BuildUserAsync(User user, CancellationToken cancellationToken)
    {
        var role = await _authRepository.GetRoleAsync(user.RoleId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var rights = await _authRepository.GetPermissionsAsync(role.Id, cancellationToken);
        var apps = await _authRepository.GetAppCodesAsync(user.Id, cancellationToken);
        var hidden = await _authRepository.GetHiddenFeaturesAsync(user.Id, cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, DisplayName = user.DisplayName, Language = user.Language, Avatar = user.AvatarFile, CreatedOn = user.CreatedOn, LastLoginOn = user.LastLoginOn, RoleId = role.Id, RoleCode = role.Code, RoleName = role.Name, IsAdmin = RoleCodes.IsAdmin(role.Code), Apps = apps, Permissions = rights.SelectMany(PermissionNames.Expand).ToList(), HiddenFeatures = hidden };
    }

    private async Task<SignInDto> StartSessionAsync(User user, AuthCallerDto caller, DateTime now, CancellationToken cancellationToken)
    {
        var refreshToken = _tokenService.NewSecret();
        var session = new UserSession { UserId = user.Id, RefreshTokenHash = _tokenService.Hash(refreshToken), DeviceId = Truncate(caller.DeviceId, DeviceIdLength) ?? _tokenService.NewSecret()[..16], UserAgent = Truncate(caller.UserAgent, UserAgentLength), LoggedInOn = now, ExpiresOn = now.AddDays(_options.Jwt.RefreshDays) };
        await _authRepository.AddSessionAsync(session, cancellationToken);
        var dto = await BuildUserAsync(user, cancellationToken);

        return new SignInDto { Auth = _tokenService.CreateResult(dto, session.Id), RefreshToken = refreshToken, RefreshExpiresOn = session.ExpiresOn };
    }

    #endregion
}
