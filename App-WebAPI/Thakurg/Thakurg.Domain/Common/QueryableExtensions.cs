namespace Thakurg.Domain.Common;

public static class QueryableExtensions
{
    #region Public Methods

    public static IQueryable<T> WhereActive<T>(this IQueryable<T> source) where T : BaseEntity
    {
        return source.Where(e => e.IsActive && !e.IsSoftDeleted && !e.IsDeleted);
    }

    // Active and archived (IsActive = false) rows, but not deleted ones: for admin screens that list and restore archived rows.
    public static IQueryable<T> WhereNotDeleted<T>(this IQueryable<T> source) where T : BaseEntity
    {
        return source.Where(e => !e.IsSoftDeleted && !e.IsDeleted);
    }

    #endregion
}
