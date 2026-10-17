namespace Thakurg.Contracts.Exceptions;

public class BusinessException : Exception
{
    public string Code { get; }

    public int StatusCode { get; }

    public object[] Arguments { get; }

    public BusinessException(string code, int statusCode = 400, params object[] arguments) : base(code)
    {
        Code = code;
        StatusCode = statusCode;
        Arguments = arguments;
    }
}