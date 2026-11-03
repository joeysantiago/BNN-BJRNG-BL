using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.API.Extensions;
using Thakurg.Application.Services;
using Thakurg.Contracts.Auth;
using Thakurg.Contracts.Khata;
using Thakurg.Contracts.Wrappers;
using Thakurg.Infrastructure.Security;

namespace Thakurg.API.Controllers;

// Where SnapKhata keeps bill photos for the whole site: local files or Azure Blob. Only a super admin who logged in with the password may see or change it.
[ApiController]
[Route("api/khata/storage")]
[Authorize(Policy = AuthPolicies.SuperAdminPassword)]
public class KhataStorageController : ControllerBase
{
    private readonly IKhataStorageService _storageService;

    public KhataStorageController(IKhataStorageService storageService)
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
    [EnableRateLimiting(SecurityExtensions.KhataReadPolicy)]
    public async Task<ActionResult<ApiResponse<KhataStorageDto>>> Get(CancellationToken cancellationToken)
    {
        var storage = await _storageService.GetAsync(cancellationToken);

        return Ok(ApiResponse<KhataStorageDto>.SuccessResponse(storage));
    }

    [HttpPut]
    [EnableRateLimiting(SecurityExtensions.SensitivePolicy)]
    public async Task<ActionResult<ApiResponse<KhataStorageDto>>> Save([FromBody] KhataStorageRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _storageService.SaveAsync(HttpContext.AuthCaller().UserId, request, cancellationToken);

        return Ok(ApiResponse<KhataStorageDto>.SuccessResponse(result.Data, result.Message));
    }

    #endregion
}
