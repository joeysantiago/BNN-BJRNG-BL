namespace Thakurg.Application.Services;

public interface ITranslationService
{
    Task<Dictionary<string, string>> GetAsync(string language, string? pages, CancellationToken cancellationToken);
}
