namespace Thakurg.Application.Services;

public interface IMasterKeyService
{
    Task VerifyAsync(string? masterKey, CancellationToken cancellationToken);
}
