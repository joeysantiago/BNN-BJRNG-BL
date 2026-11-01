using System.Text.RegularExpressions;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.YouTube;

namespace Thakurg.Infrastructure.Services;

public class YoutubeKeyService : IYoutubeKeyService
{
    private readonly IYoutubeDataApi _dataApi;

    private readonly IMessageService _messageService;

    private readonly ISettingsRepository _settingsRepository;

    private static readonly Regex KeyPattern = new(@"^[\w-]{20,100}$", RegexOptions.Compiled);

    public YoutubeKeyService(IYoutubeDataApi dataApi, IMessageService messageService, ISettingsRepository settingsRepository)
    {
        _dataApi = dataApi;
        _messageService = messageService;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    /// <summary>Stores the YouTube API key in the database once Google accepts it. Only administrators reach this (AuthPolicies.Admin).</summary>
    public async Task<string> SaveAsync(string? apiKey, CancellationToken cancellationToken)
    {
        var key = apiKey?.Trim();

        if (key is null || !KeyPattern.IsMatch(key) || !await _dataApi.IsValidKeyAsync(key, cancellationToken))
            throw new BusinessException(MessageCodes.YoutubeKeyRejected, 400);

        await _settingsRepository.UpdateAsync([], [], [], new Dictionary<string, string> { [YoutubeDataApi.KeyCode] = key }, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.YoutubeKeySaved);
    }

    public async Task<YoutubeKeyStatusDto> GetStatusAsync(CancellationToken cancellationToken)
    {
        return new YoutubeKeyStatusDto { IsSet = await _dataApi.IsConfiguredAsync(cancellationToken) };
    }

    #endregion
}
