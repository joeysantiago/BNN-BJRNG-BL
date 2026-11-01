using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Thakurg.Contracts.Configurations;

namespace Thakurg.Infrastructure.Security;

public static partial class SecurityExtensions
{
    public const string KhataReadPolicy = "khata-read";

    public const string KhataWritePolicy = "khata-write";

    #region Private Methods

    static partial void AddKhataRateLimits(RateLimiterOptions options, RateLimitOptions limits)
    {
        options.AddPolicy(KhataReadPolicy, context => RateLimitPartition.GetTokenBucketLimiter(UserOrClientKey(context), _ => TokenBucket(limits.Khata.Read)));
        options.AddPolicy(KhataWritePolicy, context => RateLimitPartition.GetTokenBucketLimiter(UserOrClientKey(context), _ => TokenBucket(limits.Khata.Write)));
    }

    #endregion
}
