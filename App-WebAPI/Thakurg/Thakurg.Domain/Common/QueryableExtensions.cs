namespace Thakurg.Domain.Common;

public static class QueryableExtensions
{
    #region Public Methods

    public static IQueryable<T> WhereActive<T>(this IQueryable<T> source) where T : BaseEntity
    {
        return source.Where(e => e.IsActive && !e.IsSoftDeleted && !e.IsDeleted);
    }

    #endregion
}
