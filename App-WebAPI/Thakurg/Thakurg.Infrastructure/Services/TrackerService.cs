using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// SnapTracker's state of a user (transactions, alerts, tracking, ignored counts, settings), its settings, SMS reading on the phone, the alerts and the
// user's data. Every change answers with a message (Messages table) and the whole state, so the app shows it at once.
public class TrackerService : ITrackerService
{
    private readonly TrackerOptions _options;

    private readonly ITrackerRepository _repository;

    private readonly IMessageService _messageService;

    private readonly ITrackerSecretProtector _protector;

    public TrackerService(ITrackerRepository repository, ITrackerSecretProtector protector, IMessageService messageService, IOptions<TrackerOptions> options)
    {
        _repository = repository;
        _protector = protector;
        _messageService = messageService;
        _options = options.Value;
    }

    #region Public Methods

    // Everything SnapTracker keeps for the user, with the SMS texts decrypted (the user's own data).
    public Task<TrackerDataDto> ExportAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        return GetStateAsync(caller, cancellationToken);
    }

    public async Task<TrackerDataDto> GetStateAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        var user = await UserAsync(caller, cancellationToken);
        var transactions = await _repository.GetTransactionsAsync(user.Id, cancellationToken);
        var alerts = await _repository.GetAlertsAsync(user.Id, cancellationToken);
        var accounts = await _repository.GetAccountsAsync(user.Id, cancellationToken);

        return new TrackerDataDto
        {
            Txns = transactions.Select(t => TrackerMapper.ToDto(t, _protector)).ToList(),
            Alerts = alerts.Select(TrackerMapper.ToDto).ToList(),
            Accounts = accounts.Select(TrackerMapper.ToDto).ToList(),
            Owner = TrackerMapper.Owner(user),
            Tracking = new TrackerTrackingDto { State = user.TrackingState, Since = user.TrackingSince is { } since ? TrackerMapper.Utc(since) : null },
            Filtered = new TrackerFilteredDto { Otp = user.FilteredOtp, Promo = user.FilteredPromo, Failed = user.FilteredFailed, Other = user.FilteredOther, Notice = user.FilteredNotice, Balance = user.FilteredBalance },
            Settings = TrackerMapper.ToSettings(user, TrackerAlertTypes.All),
        };
    }

    public async Task<ServiceResultDto<TrackerDataDto>> DeleteAllAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        await _repository.DeleteAllAsync(caller.UserId, cancellationToken);

        return new ServiceResultDto<TrackerDataDto> { Message = await _messageService.GetAsync(MessageCodes.TrackerDataDeleted), Data = new TrackerDataDto { Settings = new TrackerSettingsDto { Approval = _options.NewUser.ApprovalMode, Threshold = _options.NewUser.AutoApprovePercent, Push = _options.NewUser.PushEnabled, Alerts = TrackerAlertTypes.All.ToDictionary(t => t, t => _options.NewUser.AlertTypes.Contains(t)) }, Tracking = new TrackerTrackingDto { State = TrackingStates.Permission } } };
    }

    public async Task<ServiceResultDto<TrackerDataDto>> ReadAlertsAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        foreach (var alert in await _repository.GetAlertsAsync(caller.UserId, cancellationToken))
            alert.IsRead = true;

        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerAlertsRead, cancellationToken);
    }

    public async Task<ServiceResultDto<TrackerDataDto>> DeleteSmsTextsAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        await _repository.DeleteSmsTextsAsync(caller.UserId, cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerSmsTextsDeleted, cancellationToken);
    }

    // SMS reading on the phone: enable, pause, resume or revoke. Pausing, resuming and revoking leave an alert (when that alert type is on).
    public async Task<ServiceResultDto<TrackerDataDto>> TrackingAsync(TrackerCallerDto caller, string action, CancellationToken cancellationToken)
    {
        var user = await UserAsync(caller, cancellationToken);
        string code;

        switch (action)
        {
            case "enable":
            case "resume":
                var wasPaused = user.TrackingState == TrackingStates.Paused;
                user.TrackingState = TrackingStates.Enabled;
                user.TrackingSince ??= DateTime.UtcNow;
                code = wasPaused ? MessageCodes.TrackerTrackingResumed : MessageCodes.TrackerTrackingOn;
                if (wasPaused)
                    Alert(user, TrackerAlertTypes.Paused);
                break;
            case "pause":
                user.TrackingState = TrackingStates.Paused;
                code = MessageCodes.TrackerTrackingPaused;
                Alert(user, TrackerAlertTypes.Paused);
                break;
            case "revoke":
                user.TrackingState = TrackingStates.Permission;
                user.TrackingSince = null;
                code = MessageCodes.TrackerTrackingRevoked;
                Alert(user, TrackerAlertTypes.Revoked);
                break;
            default:
                throw new BusinessException(MessageCodes.TrackerInvalid, 400);
        }

        await _repository.SaveChangesAsync(cancellationToken);
        await _repository.TrimAlertsAsync(user.Id, _options.Limits.MaxAlerts, cancellationToken);

        return await ResultAsync(caller, code, cancellationToken);
    }

    public async Task<ServiceResultDto<TrackerDataDto>> SaveSettingsAsync(TrackerCallerDto caller, TrackerSettingsDto request, CancellationToken cancellationToken)
    {
        var limits = _options.Limits;

        if (!TrackerApprovals.All.Contains(request.Approval) || request.Threshold < limits.MinAutoApprovePercent || request.Threshold > limits.MaxAutoApprovePercent || request.Alerts.Keys.Any(k => !TrackerAlertTypes.All.Contains(k)))
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var user = await UserAsync(caller, cancellationToken);
        user.ApprovalMode = request.Approval;
        user.AutoApprovePercent = request.Threshold;
        user.PushEnabled = request.Push;
        user.AlertTypes = string.Join(',', TrackerAlertTypes.All.Where(t => request.Alerts.TryGetValue(t, out var on) && on));
        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerSettingsSaved, cancellationToken);
    }

    #endregion

    #region Private Methods

    private void Alert(TrackerUser user, string type)
    {
        if (user.AlertTypes.Split(',').Contains(type))
            _repository.AddAlert(new TrackerAlert { TrackerUserId = user.Id, Type = type, Args = "{}" });
    }

    private async Task<TrackerUser> UserAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        return await _repository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    private async Task<ServiceResultDto<TrackerDataDto>> ResultAsync(TrackerCallerDto caller, string code, CancellationToken cancellationToken)
    {
        return new ServiceResultDto<TrackerDataDto> { Message = await _messageService.GetAsync(code), Data = await GetStateAsync(caller, cancellationToken) };
    }

    #endregion
}
