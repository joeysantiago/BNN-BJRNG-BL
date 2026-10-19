namespace Thakurg.Application.Services;

public interface IMasterKeyService
{
    Task<bool> IsSetAsync(CancellationToken cancellationToken);

    Task VerifyAsync(string? masterKey, CancellationToken cancellationToken);

    Task<string> CreateAsync(string? password, string? confirm, CancellationToken cancellationToken);
}
