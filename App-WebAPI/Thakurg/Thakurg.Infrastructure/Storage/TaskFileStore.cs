using Microsoft.Extensions.Options;
using Thakurg.Application.Storage;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;

namespace Thakurg.Infrastructure.Storage;

// The pictures of tasks in the file store chosen in Settings > Keys, in the Tasks:Folder folder: App-Data/tasks/<FileId> or <env>/tasks/<FileId> in the
// container. FileId stays "<taskUserId>/<name>", as saved in TaskAttachments.
public class TaskFileStore : ITaskFileStore
{
    private readonly string _folder;

    private readonly IFileStore _fileStore;

    public TaskFileStore(IOptions<TasksOptions> options, IFileStore fileStore)
    {
        _folder = options.Value.Folder;
        _fileStore = fileStore;
    }

    #region Public Methods

    public Task DeleteAsync(string fileId)
    {
        return _fileStore.DeleteAsync(PathOf(fileId), CancellationToken.None);
    }

    public Task<Stream?> OpenAsync(string fileId)
    {
        return _fileStore.OpenAsync(PathOf(fileId), CancellationToken.None);
    }

    public async Task SaveAsync(string fileId, byte[] content, CancellationToken cancellationToken)
    {
        await using var stream = new MemoryStream(content);
        await _fileStore.SaveAsync(PathOf(fileId), stream, cancellationToken);
    }

    public async Task CopyAsync(string fromFileId, string toFileId, CancellationToken cancellationToken)
    {
        await using var content = await _fileStore.OpenAsync(PathOf(fromFileId), cancellationToken) ?? throw new BusinessException(MessageCodes.TasksPhotoNotFound, 404);
        await _fileStore.SaveAsync(PathOf(toFileId), content, cancellationToken);
    }

    #endregion

    #region Private Methods

    private string PathOf(string fileId)
    {
        return $"{_folder}/{fileId}";
    }

    #endregion
}
