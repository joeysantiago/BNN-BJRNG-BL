namespace Thakurg.Contracts.Configurations;

// Tasks:LocalFiles: the folder the pictures of tasks are kept in, relative to the content root of the API (App-Data/tasks, never committed).
public class TasksLocalFilesOptions
{
    public string Root { get; set; } = string.Empty;
}
