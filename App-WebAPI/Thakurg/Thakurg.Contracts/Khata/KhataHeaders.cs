namespace Thakurg.Contracts.Khata;

// Request headers used by the SnapKhata API.
public static class KhataHeaders
{
    public const string Device = "X-Khata-Device";

    public const string PinProof = "X-Khata-Pin-Proof";

    public const string IdempotencyKey = "X-Idempotency-Key";
}
