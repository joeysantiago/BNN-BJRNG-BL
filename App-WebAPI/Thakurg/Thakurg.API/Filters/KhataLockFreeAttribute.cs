namespace Thakurg.API.Filters;

// A SnapKhata action that works while the app lock is locked (the PIN endpoints themselves). Every other Khata action is refused then.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class KhataLockFreeAttribute : Attribute
{
}
