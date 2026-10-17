namespace Thakurg.Application.Services;

public interface IMessageService
{
    Task<string> GetAsync(string code, params object[] arguments);
}
