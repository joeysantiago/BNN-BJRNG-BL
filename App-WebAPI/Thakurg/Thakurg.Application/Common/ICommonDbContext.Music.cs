using Microsoft.EntityFrameworkCore;
using Thakurg.Domain.Entities;

namespace Thakurg.Application.Common;

public partial interface ICommonDbContext
{
    DbSet<MusicTrack> MusicTracks { get; }

    DbSet<MusicPlayer> MusicPlayers { get; }
}
