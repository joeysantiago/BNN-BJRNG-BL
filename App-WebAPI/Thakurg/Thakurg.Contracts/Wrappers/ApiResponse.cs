namespace Thakurg.Contracts.Wrappers;

public class ApiResponse<T>
{
    public T? Data { get; set; }

    public bool Success { get; set; }

    public string? Message { get; set; }

    #region Public Methods

    public static ApiResponse<T> FailureResponse(string message)
    {
        return new ApiResponse<T> { Success = false, Message = message };
    }

    public static ApiResponse<T> SuccessResponse(T data, string? message = null)
    {
        return new ApiResponse<T> { Success = true, Message = message, Data = data };
    }

    #endregion
}