using Thakurg.Application.Services;

namespace Thakurg.Application.Common;

// What Tracker uses to take in an SMS: the reader, the protector of the SMS text and the flows (TrackerTransactionService).
public interface ITrackerSmsServices
{
    ITrackerSmsReader Reader { get; }

    ITrackerFlowService Flows { get; }

    ITrackerSecretProtector Protector { get; }
}
