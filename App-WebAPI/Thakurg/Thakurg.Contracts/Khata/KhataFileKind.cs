namespace Thakurg.Contracts.Khata;

// KhataStoredFiles.FileKind (snapkhata-design.md).
public enum KhataFileKind : byte
{
    Photo = 1,
    LedgerJson = 2,
    BookJson = 3,
    Export = 4,
    ImportOriginal = 5,
    UpiQr = 6
}
