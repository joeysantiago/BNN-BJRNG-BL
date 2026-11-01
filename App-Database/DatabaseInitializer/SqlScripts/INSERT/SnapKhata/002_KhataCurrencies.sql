IF NOT EXISTS (SELECT 1 FROM KhataCurrencies WHERE OwnerUserId IS NULL)
BEGIN
    INSERT INTO KhataCurrencies (OwnerUserId, Code, Symbol, Name, Decimals, IsIso, SortOrder)
    VALUES
        (NULL, N'INR', N'₹', N'Indian rupee', 2, 1, 1),
        (NULL, N'AED', N'د.إ', N'UAE dirham', 2, 1, 2),
        (NULL, N'SAR', N'﷼', N'Saudi riyal', 2, 1, 3),
        (NULL, N'USD', N'$', N'US dollar', 2, 1, 4),
        (NULL, N'EUR', N'€', N'Euro', 2, 1, 5),
        (NULL, N'GBP', N'£', N'British pound', 2, 1, 6),
        (NULL, N'KWD', N'د.ك', N'Kuwaiti dinar', 3, 1, 7),
        (NULL, N'OMR', N'ر.ع.', N'Omani rial', 3, 1, 8),
        (NULL, N'BHD', N'.د.ب', N'Bahraini dinar', 3, 1, 9),
        (NULL, N'QAR', N'ر.ق', N'Qatari riyal', 2, 1, 10),
        (NULL, N'NPR', N'रु', N'Nepalese rupee', 2, 1, 11),
        (NULL, N'PKR', N'₨', N'Pakistani rupee', 2, 1, 12),
        (NULL, N'BDT', N'৳', N'Bangladeshi taka', 2, 1, 13);
END
GO
