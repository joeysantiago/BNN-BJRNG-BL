using Thakurg.Contracts.Storage;

namespace Thakurg.Infrastructure.Storage;

public static class StorageRules
{
    #region Public Methods

    // "creta\a.mp3" and "/creta//a.mp3" become "creta/a.mp3"; an empty path or one with a "." or ".." part gives null.
    public static string? CleanPath(string path)
    {
        var parts = path.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 0 || parts.Any(p => p is "." or "..") ? null : string.Join('/', parts);
    }

    // The saved AppSettings Storage.Provider; no row or an unknown value means Azure, the store every environment starts with.
    public static string Provider(string? saved)
    {
        var provider = saved?.Trim().ToLowerInvariant();

        return provider == StorageProviders.Local ? StorageProviders.Local : StorageProviders.Azure;
    }

    #endregion
}
