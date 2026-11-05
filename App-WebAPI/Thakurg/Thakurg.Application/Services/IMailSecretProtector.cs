namespace Thakurg.Application.Services;

// Encrypts the mail server passwords kept in the database (MailSettings) with ASP.NET Data Protection.
public interface IMailSecretProtector
{
    string Protect(string secret);

    string Unprotect(string protectedSecret);
}
