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

    private readonly IMasterKeyService _masterKeyService;

    private readonly ISettingsRepository _settingsRepository;

    private static readonly Regex KeyPattern = new(@"^[\w-]{20,100}$", RegexOptions.Compiled);

    public YoutubeKeyService(IYoutubeDataApi dataApi, IMessageService messageService, IMasterKeyService masterKeyService, ISettingsRepository settingsRepository)
    {
        _dataApi = dataApi;
        _messageService = messageService;
        _masterKeyService = masterKeyService;
        _settingsRepository = settingsRepository;
    }

    #region Public Methods

    public async Task<YoutubeKeyStatusDto> GetStatusAsync(CancellationToken cancellationToken)
    {
        return new YoutubeKeyStatusDto { IsSet = await _dataApi.IsConfiguredAsync(cancellationToken) };
    }

    /// <summary>Stores the YouTube API key in the database after the master key is proven and Google accepts the key.</summary>
    public async Task<string> SaveAsync(string? apiKey, string? masterKey, CancellationToken cancellationToken)
    {
        await _masterKeyService.VerifyAsync(masterKey, cancellationToken);
        var key = apiKey?.Trim();

        if (key is null || !KeyPattern.IsMatch(key) || !await _dataApi.IsValidKeyAsync(key, cancellationToken))
            throw new BusinessException(MessageCodes.YoutubeKeyRejected, 400);

        await _settingsRepository.UpdateAsync([], [], [], new Dictionary<string, string> { [YoutubeDataApi.KeyCode] = key }, cancellationToken);

        return await _messageService.GetAsync(MessageCodes.YoutubeKeySaved);
    }

    #endregion
}
