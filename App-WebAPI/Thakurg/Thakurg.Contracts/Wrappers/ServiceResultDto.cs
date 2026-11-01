namespace Thakurg.Contracts.Wrappers;

public class ServiceResultDto<T>
{
    public string? Message { get; set; }

    public T Data { get; set; } = default!;
}