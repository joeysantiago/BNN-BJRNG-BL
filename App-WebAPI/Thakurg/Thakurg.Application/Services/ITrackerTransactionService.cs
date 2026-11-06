using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Application.Services;

// SnapTracker's transactions: reading a pasted or shared SMS or a batch of an SMS backup (sender list, OTP and promotion filters, parsing, category, duplicate check, approval),
// adding and editing by hand, confirm / ignore / restore / not a duplicate, the category (optionally remembered for the merchant) and delete.
public interface ITrackerTransactionService
{
    Task<TrackerSmsReadDto> ReadSmsAsync(TrackerCallerDto caller, TrackerSmsRequestDto request, CancellationToken cancellationToken);

    Task<TrackerImportReadDto> ImportSmsAsync(TrackerCallerDto caller, TrackerImportRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> RemoveAsync(TrackerCallerDto caller, int id, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> AddAsync(TrackerCallerDto caller, TrackerTxnRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> ActAsync(TrackerCallerDto caller, int id, string action, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> EditAsync(TrackerCallerDto caller, int id, TrackerTxnRequestDto request, CancellationToken cancellationToken);

    Task<ServiceResultDto<TrackerDataDto>> SetCategoryAsync(TrackerCallerDto caller, int id, TrackerCategoryRequestDto request, CancellationToken cancellationToken);
}
