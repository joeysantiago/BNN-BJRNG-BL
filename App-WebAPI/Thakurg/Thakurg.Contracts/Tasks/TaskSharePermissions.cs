namespace Thakurg.Contracts.Tasks;

// What the person a task is shared with may do. Read: open it and its pictures. Edit: also change it, tick its checklist, add or remove pictures, complete or reopen it.
// Deleting, duplicating and sharing stay with the owner.
public static class TaskSharePermissions
{
    public const string Edit = "edit";

    public const string Read = "read";

    public static readonly string[] All = [Read, Edit];
}
