namespace Thakurg.Application.Services;

public interface IMessageService
{
    string CurrentLanguage();

    Task<string> GetAsync(string code, params object[] arguments);

    Task<string> GetInAsync(string language, string code, params object[] arguments);
}
