using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

// SnapTracker's state of a user (everything the app shows), its settings, SMS reading on the phone, the alerts and the user's data (export, delete).
public interface ITrackerService
{
    Task<TrackerDataDto> GetStateAsync(TrackerCallerDto caller, CancellationToken cancellationToken);

    Task<TrackerDataDto> ExportAsync(TrackerCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> DeleteAllAsync(TrackerCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> ReadAlertsAsync(TrackerCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> DeleteSmsTextsAsync(TrackerCallerDto caller, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> TrackingAsync(TrackerCallerDto caller, string action, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> SaveSettingsAsync(TrackerCallerDto caller, TrackerSettingsDto request, CancellationToken cancellationToken);
}
