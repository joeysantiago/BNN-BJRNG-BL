namespace Thakurg.Application.Storage;

public interface IMusicFileStore
{
    void Delete(string folder, string fileName);

    bool Exists(string folder, string fileName);

    Stream? Open(string folder, string fileName);

    Task SaveAsync(string folder, string fileName, Stream content, CancellationToken cancellationToken);
}
