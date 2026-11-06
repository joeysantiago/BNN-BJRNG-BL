namespace Thakurg.Application.Services;

// Finds the SnapTracker profile of an account, and makes it on the first call with the starting settings of Tracker:NewUser.
public interface ITrackerProfileService
{
    Task<int> ResolveAsync(int accountUserId, CancellationToken cancellationToken);
}
