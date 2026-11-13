using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Services;

// What each SnapTracker transaction counts towards (TrackerFlows): worked out again for all of a user's SMS transactions after every change, with the
// pairs (self transfers, a card bill and the card's "payment received"), cards, loans and the user's own rules; plus "Mark as…", the user's own names and
// mobiles, and the names of their accounts, cards and loans.
public interface ITrackerFlowService
{
    Task ReflowAsync(TrackerUser user, CancellationToken cancellationToken);

    Task RecordDueAsync(TrackerUser user, TrackerDueDto due, string provider, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> SaveOwnerAsync(TrackerCallerDto caller, TrackerOwnerDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> SetFlowAsync(TrackerCallerDto caller, int id, TrackerFlowRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> SetAccountLabelAsync(TrackerCallerDto caller, int id, TrackerAccountRequestDto request, CancellationToken cancellationToken);
}
