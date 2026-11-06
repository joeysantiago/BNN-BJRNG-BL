using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Tracker;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Services;

// The SnapTracker profile of an account: found, or made on the first call with the starting settings of Tracker:NewUser (SMS reading off until the user turns it on).
public class TrackerProfileService : ITrackerProfileService
{
    private readonly TrackerOptions _options;

    private readonly ITrackerRepository _repository;

    public TrackerProfileService(ITrackerRepository repository, IOptions<TrackerOptions> options)
    {
        _repository = repository;
        _options = options.Value;
    }

    #region Public Methods

    public async Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken)
    {
        if (await _repository.FindUserByAccountAsync(accountUserId, cancellationToken) is { } found)
            return found.Id;

        var start = _options.NewUser;
        var user = new TrackerUser { UserId = accountUserId, ApprovalMode = start.ApprovalMode, AutoApprovePercent = start.AutoApprovePercent, PushEnabled = start.PushEnabled, AlertTypes = string.Join(',', start.AlertTypes), TrackingState = TrackingStates.Permission };

        if (await _repository.TryAddUserAsync(user, cancellationToken))
            return user.Id;

        // A parallel request made the profile first.
        return (await _repository.FindUserByAccountAsync(accountUserId, cancellationToken))!.Id;
    }

    #endregion
}
