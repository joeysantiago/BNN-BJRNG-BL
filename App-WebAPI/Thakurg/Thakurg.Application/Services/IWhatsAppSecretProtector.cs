namespace Thakurg.Application.Services;

// Encrypts the WhatsApp access token kept in the database (WhatsAppSettings) with ASP.NET Data Protection.
public interface IWhatsAppSecretProtector
{
    string Protect(string secret);

    string Unprotect(string protectedSecret);
}
