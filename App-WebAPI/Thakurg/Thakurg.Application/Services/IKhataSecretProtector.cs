namespace Thakurg.Application.Services;

// Encrypts secrets kept in the database (the Azure Storage connection string) with ASP.NET Data Protection.
public interface IKhataSecretProtector
{
    string Protect(string secret);

    string Unprotect(string protectedSecret);
}
