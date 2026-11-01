using Microsoft.AspNetCore.Mvc;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{


    #region Public Methods

    [HttpGet]
    public ActionResult<ApiResponse<bool>> Get()
    {
        return Ok(ApiResponse<bool>.SuccessResponse(true));
    }

    #endregion
}
