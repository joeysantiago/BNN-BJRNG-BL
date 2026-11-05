namespace Thakurg.Application.Services;

// E-mails a user about a change to their own account, in their language. A mail that cannot be sent is logged, never thrown.
public interface IAccountMailService
{
    Task SendAccountDeletedAsync(string email, string displayName, string language, DateTime deletedOn, CancellationToken cancellationToken);
}
