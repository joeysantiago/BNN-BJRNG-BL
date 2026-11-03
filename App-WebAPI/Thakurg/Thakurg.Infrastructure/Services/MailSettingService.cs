using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Mail;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;
using Thakurg.Infrastructure.Email;

namespace Thakurg.Infrastructure.Services;

// Settings > Mail (super admin, password session only): the mail server for one-time codes and the one for notifications, one profile each.
// A profile that is not switched on leaves its mail on the server in appsettings Email:Smtp. The password is encrypted at rest and never returned.
public class MailSettingService : IMailSettingService
{
    private const int MaxPort = 65535;

    private const int MaxHostLength = 255;

    private const int MaxNameLength = 100;

    private const int MaxUserLength = 256;

    private readonly EmailSmtpOptions _smtp;

    private const int MaxPasswordLength = 256;

    private readonly IEmailSender _emailSender;

    private readonly IAuthRepository _authRepository;

    private readonly IMailSecretProtector _protector;

    private readonly IMessageService _messageService;

    private readonly IMailSettingRepository _mailRepository;

    public MailSettingService(IOptions<EmailOptions> options, IMailSettingRepository mailRepository, IMailSecretProtector protector, IEmailSender emailSender, IAuthRepository authRepository, IMessageService messageService)
    {
        _smtp = options.Value.Smtp;
        _mailRepository = mailRepository;
        _protector = protector;
        _emailSender = emailSender;
        _authRepository = authRepository;
        _messageService = messageService;
    }

    #region Public Methods

    // Both profiles, in MailPurposes order; one never saved starts from the server in Email:Smtp, switched off.
    public async Task<List<MailSettingDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var settings = await _mailRepository.GetAllAsync(cancellationToken);

        return MailPurposes.All.Select(p => ToDto(p, settings.FirstOrDefault(s => s.Purpose == p))).ToList();
    }

    // Sends a test e-mail through the saved profile to the super admin's own address. The profile must be switched on, or the mail would go through Email:Smtp.
    public async Task<string> TestAsync(int userId, string purpose, CancellationToken cancellationToken)
    {
        RequirePurpose(purpose);
        var setting = await _mailRepository.GetAsync(purpose, cancellationToken);

        if (setting is not { Enabled: true } || string.IsNullOrWhiteSpace(setting.Host))
            throw new BusinessException(MessageCodes.MailTestOff, 400);

        var user = await _authRepository.GetUserAsync(userId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
        var subject = await _messageService.GetAsync(MessageCodes.MailTestSubject);
        var body = await _messageService.GetAsync(MessageCodes.MailTestBody);
        var frame = await EmailHtml.FrameAsync(_messageService, _messageService.CurrentLanguage());
        await _emailSender.SendAsync(purpose, user.Email, subject, EmailHtml.Paragraphs(frame, [body]), cancellationToken);

        return await _messageService.GetAsync(MessageCodes.MailTestSent, user.Email);
    }

    // Switching a profile on needs a host and a From address. A blank password keeps the saved one; without a user name the server is used without a login.
    public async Task<ServiceResultDto<MailSettingDto>> SaveAsync(int userId, string purpose, MailSettingRequestDto request, CancellationToken cancellationToken)
    {
        RequirePurpose(purpose);
        var host = Optional(request.Host);
        var userName = Optional(request.UserName);
        var fromName = Optional(request.FromName);
        var password = request.Password ?? string.Empty;
        var security = (request.Security ?? string.Empty).Trim().ToLowerInvariant();
        var fromAddress = string.IsNullOrWhiteSpace(request.FromAddress) ? null : EmailAddress.Normalize(request.FromAddress) ?? throw Invalid();

        if (!MailSecurityModes.All.Contains(security) || request.Port is < 1 or > MaxPort || host?.Length > MaxHostLength || userName?.Length > MaxUserLength || fromName?.Length > MaxNameLength || password.Length > MaxPasswordLength)
            throw Invalid();

        if (request.Enabled && (host is null || fromAddress is null))
            throw Invalid();

        var setting = await _mailRepository.GetAsync(purpose, cancellationToken) ?? new MailSetting { Purpose = purpose, CreatedBy = userId };

        if (password.Length > 0)
            setting.PasswordProtected = _protector.Protect(password);

        if (userName is null)
            setting.PasswordProtected = null;

        setting.Host = host;
        setting.Port = request.Port;
        setting.Security = security;
        setting.Enabled = request.Enabled;
        setting.UserName = userName;
        setting.FromName = fromName;
        setting.FromAddress = fromAddress;
        await SaveAsync(setting, userId, cancellationToken);

        return new ServiceResultDto<MailSettingDto> { Data = ToDto(purpose, setting), Message = await _messageService.GetAsync(MessageCodes.MailSaved) };
    }

    #endregion

    #region Private Methods

    private static BusinessException Invalid()
    {
        return new BusinessException(MessageCodes.MailInvalid, 400);
    }

    private static string? Optional(string? value)
    {
        var text = value?.Trim();

        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static void RequirePurpose(string purpose)
    {
        if (!MailPurposes.All.Contains(purpose))
            throw new BusinessException(MessageCodes.MailInvalid, 404);
    }

    // The MailSecurityModes value of the Email:Smtp server, as the starting choice of a profile never saved.
    private static string SecurityOf(EmailSmtpOptions smtp)
    {
        if (!smtp.UseSsl)
            return MailSecurityModes.None;

        return smtp.ImplicitTls ? MailSecurityModes.Ssl : MailSecurityModes.StartTls;
    }

    private MailSettingDto ToDto(string purpose, MailSetting? setting)
    {
        if (setting is null)
            return new MailSettingDto { Purpose = purpose, Enabled = false, Host = _smtp.Host, Port = _smtp.Port, Security = SecurityOf(_smtp), UserName = _smtp.User, FromAddress = _smtp.FromAddress, FromName = _smtp.FromName };

        return new MailSettingDto { Purpose = purpose, Enabled = setting.Enabled, Host = setting.Host ?? string.Empty, Port = setting.Port, Security = setting.Security, UserName = setting.UserName ?? string.Empty, HasPassword = setting.PasswordProtected is not null, FromAddress = setting.FromAddress ?? string.Empty, FromName = setting.FromName ?? string.Empty };
    }

    private async Task SaveAsync(MailSetting setting, int userId, CancellationToken cancellationToken)
    {
        if (setting.Id == 0)
        {
            await _mailRepository.AddAsync(setting, cancellationToken);
            return;
        }

        setting.ModifiedBy = userId;
        setting.ModifiedOn = DateTime.UtcNow;
        await _mailRepository.SaveChangesAsync(cancellationToken);
    }

    #endregion
}
