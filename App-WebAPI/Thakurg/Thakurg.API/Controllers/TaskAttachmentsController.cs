using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Thakurg.API.Extensions;
using Thakurg.API.Filters;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Tasks;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

// The pictures of tasks (My Tasks). Only the owner of the task can add, open or remove them; the app loads them with its token (fetch), never by a public URL.
[ApiController]
[Route("api/tasks")]
[Authorize(Policy = AuthPolicies.Tasks)]
[TypeFilter(typeof(TasksProfileFilter))]
public class TaskAttachmentsController : ControllerBase
{
    private readonly ITaskAttachmentService _attachmentService;

    public TaskAttachmentsController(ITaskAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    #region Public Methods

    [HttpGet("attachments/{attachmentId:int}")]
    public async Task<IActionResult> Get(int attachmentId, CancellationToken cancellationToken)
    {
        var file = await _attachmentService.OpenAsync(HttpContext.TaskCaller(), attachmentId, cancellationToken);
        Response.Headers.CacheControl = "private, max-age=86400";

        return File(file.Content, file.ContentType);
    }

    [HttpDelete("attachments/{attachmentId:int}")]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Remove(int attachmentId, CancellationToken cancellationToken)
    {
        var result = await _attachmentService.RemoveAsync(HttpContext.TaskCaller(), attachmentId, cancellationToken);

        return Ok(ApiResponse<TaskChangesDto>.SuccessResponse(result.Data, result.Message));
    }

    [HttpPost("items/{taskId:int}/attachments")]
    [TypeFilter(typeof(TasksUploadLimitFilter))]
    public async Task<ActionResult<ApiResponse<TaskChangesDto>>> Upload(int taskId, [FromForm] List<IFormFile> files, CancellationToken cancellationToken)
    {
        var uploads = files.Select(f => new TaskPhotoUploadDto { Length = f.Length, FileName = f.FileName, Content = f.OpenReadStream() }).ToList();

        try
        {
            var result = await _attachmentService.UploadAsync(HttpContext.TaskCaller(), taskId, uploads, cancellationToken);

            return Ok(ApiResponse<TaskChangesDto>.SuccessResponse(result.Data, result.Message));
        }
        finally
        {
            foreach (var upload in uploads)
                await upload.Content.DisposeAsync();
        }
    }

    #endregion
}
