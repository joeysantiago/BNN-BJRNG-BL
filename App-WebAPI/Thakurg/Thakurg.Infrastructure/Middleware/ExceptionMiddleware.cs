using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Thakurg.Application.Services;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Wrappers;

namespace Thakurg.Infrastructure.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    #region Public Methods

    public async Task InvokeAsync(HttpContext context, IMessageService messageService)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
        }
        catch (BusinessException ex)
        {
            await WriteAsync(context, messageService, ex.StatusCode, ex.Code, ex.Arguments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Path}", context.Request.Path);
            await WriteAsync(context, messageService, StatusCodes.Status500InternalServerError, MessageCodes.UnexpectedError, []);
        }
    }

    #endregion

    #region Private Methods

    private static async Task WriteAsync(HttpContext context, IMessageService messageService, int statusCode, string code, object[] arguments)
    {
        if (context.Response.HasStarted)
        {
            context.Abort();

            return;
        }

        var message = await messageService.GetAsync(code, arguments);
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(ApiResponse<object?>.FailureResponse(message));
    }

    #endregion
}
