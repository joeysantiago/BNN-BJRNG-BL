namespace Thakurg.API.Filters;

// Marks a My Tasks endpoint that works while the App Lock is closed (the PIN calls themselves). Every other one is refused with 423 until the PIN is entered.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class TasksLockFreeAttribute : Attribute
{
}
