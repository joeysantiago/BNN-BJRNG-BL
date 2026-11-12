using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Storage;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Settings > Keys > File storage: where every app keeps its files (the App-Data folder or the Azure Blob container), and the copy of every file from
// one store to the other ({target} = local or azure). Only a super admin who logged in with the password may see or change it.
[ApiController]
[Route("api/admin/storage")]
[Authorize(Policy = AuthPolicies.SuperAdminPassword)]
public class StorageSettingsController : ControllerBase
{
    private readonly IStorageSettingService _storageService;

    public StorageSettingsController(IStorageSettingService storageService)
    {
        _storageService = storageService;
    }

    #region Public Methods

    [HttpPost("test")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Test(CancellationToken cancellationToken)
    {
        var message = await _storageService.TestAsync(cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<StorageSettingDto>>> Get(CancellationToken cancellationToken)
    {
        var storage = await _storageService.GetAsync(cancellationToken);

        return Ok(ApiResponse<StorageSettingDto>.SuccessResponse(storage));
    }

    [HttpPost("copy/{target}")]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<object?>>> Copy(string target, CancellationToken cancellationToken)
    {
        var message = await _storageService.CopyAsync(target, cancellationToken);

        return Ok(ApiResponse<object?>.SuccessResponse(null, message));
    }

    [HttpPut]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<StorageSettingDto>>> Save([FromBody] StorageSettingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _storageService.SaveAsync(request, cancellationToken);

        return Ok(ApiResponse<StorageSettingDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
