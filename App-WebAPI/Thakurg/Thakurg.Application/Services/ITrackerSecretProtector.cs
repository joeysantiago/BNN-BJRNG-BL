namespace Thakurg.Application.Services;

// Encrypts the original SMS texts of Tracker before they are stored, and reads them back.
public interface ITrackerSecretProtector
{
    string Protect(string text);

    string Unprotect(string protectedText);
}
