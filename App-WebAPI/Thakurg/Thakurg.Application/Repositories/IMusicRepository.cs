using Thakurg.Domain.Entities;

namespace Thakurg.Application.Repositories;

public interface IMusicRepository
{
    Task RemoveTrackAsync(MusicTrack track, CancellationToken cancellationToken);

    Task AddTracksAsync(List<MusicTrack> tracks, CancellationToken cancellationToken);

    Task<MusicPlayer?> GetPlayerAsync(string code, CancellationToken cancellationToken);

    Task<List<MusicTrack>> GetTracksAsync(int playerId, CancellationToken cancellationToken);

    Task<MusicTrack?> GetTrackAsync(int playerId, int trackId, CancellationToken cancellationToken);

    Task UpdatePasswordAsync(int playerId, string passwordHash, CancellationToken cancellationToken);
}
