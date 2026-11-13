using Thakurg.Application.Common;
using Thakurg.Application.Services;

namespace Thakurg.Infrastructure.Common;

public class TrackerSmsServices : ITrackerSmsServices
{
    public ITrackerSmsReader Reader { get; }

    public ITrackerFlowService Flows { get; }

    public ITrackerSecretProtector Protector { get; }

    public TrackerSmsServices(ITrackerSmsReader reader, ITrackerSecretProtector protector, ITrackerFlowService flows)
    {
        Reader = reader;
        Protector = protector;
        Flows = flows;
    }
}
