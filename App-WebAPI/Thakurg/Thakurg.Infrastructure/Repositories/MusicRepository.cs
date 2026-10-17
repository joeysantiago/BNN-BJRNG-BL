using Microsoft.EntityFrameworkCore;
using Thakurg.Application.Common;
using Thakurg.Application.Repositories;
using Thakurg.Domain.Common;
using Thakurg.Domain.Entities;

namespace Thakurg.Infrastructure.Repositories;

public class MusicRepository : IMusicRepository
{
    private readonly ICommonDbContext _dbContext;

    public MusicRepository(ICommonDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Public Methods

    public async Task RemoveTrackAsync(MusicTrack track, CancellationToken cancellationToken)
    {
        _dbContext.MusicTracks.Remove(track);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<MusicPlayer?> GetPlayerAsync(string code, CancellationToken cancellationToken)
    {
        return _dbContext.MusicPlayers.AsNoTracking().WhereActive().FirstOrDefaultAsync(p => p.Code == code, cancellationToken);
    }

    public async Task AddTracksAsync(List<MusicTrack> tracks, CancellationToken cancellationToken)
    {
        _dbContext.MusicTracks.AddRange(tracks);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<List<MusicTrack>> GetTracksAsync(int playerId, CancellationToken cancellationToken)
    {
        return _dbContext.MusicTracks.AsNoTracking().WhereActive().Where(t => t.PlayerId == playerId).OrderBy(t => t.SortOrder).ThenBy(t => t.Id).ToListAsync(cancellationToken);
    }

    public Task<MusicTrack?> GetTrackAsync(int playerId, int trackId, CancellationToken cancellationToken)
    {
        return _dbContext.MusicTracks.WhereActive().FirstOrDefaultAsync(t => t.Id == trackId && t.PlayerId == playerId, cancellationToken);
    }

    public Task UpdatePasswordAsync(int playerId, string passwordHash, CancellationToken cancellationToken)
    {
        return _dbContext.MusicPlayers.Where(p => p.Id == playerId).ExecuteUpdateAsync(s => s.SetProperty(p => p.PasswordHash, passwordHash).SetProperty(p => p.ModifiedOn, DateTime.UtcNow), cancellationToken);
    }

    #endregion
}
