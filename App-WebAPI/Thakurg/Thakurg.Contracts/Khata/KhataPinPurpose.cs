namespace Thakurg.Contracts.Khata;

// The action a PIN proof is valid for (KhataPinProofs.Purpose).
public enum KhataPinPurpose : byte
{
    EditTransaction = 1,
    DeleteTransaction = 2,
    ChangePin = 3,
    DisconnectDrive = 4,
    ChangeDriveAccount = 5,
    DeleteContact = 6,
    AllowContactEntries = 7,
    DeleteBook = 8,
    ChangePaymentDetails = 9,
    RestoreBook = 10,
    DeleteAccount = 11,
    UndoImport = 12
}
