-- The states and union territories of India (ISO 3166-2:IN codes), in name order. The country is looked up by its code.
IF NOT EXISTS (SELECT 1 FROM States)
BEGIN
    INSERT INTO States (CountryId, Code, Name, SortOrder)
    SELECT c.Id, v.Code, v.Name, v.SortOrder
    FROM (VALUES
        ('AN', N'Andaman and Nicobar Islands', 1),
        ('AP', N'Andhra Pradesh', 2),
        ('AR', N'Arunachal Pradesh', 3),
        ('AS', N'Assam', 4),
        ('BR', N'Bihar', 5),
        ('CH', N'Chandigarh', 6),
        ('CG', N'Chhattisgarh', 7),
        ('DH', N'Dadra and Nagar Haveli and Daman and Diu', 8),
        ('DL', N'Delhi', 9),
        ('GA', N'Goa', 10),
        ('GJ', N'Gujarat', 11),
        ('HR', N'Haryana', 12),
        ('HP', N'Himachal Pradesh', 13),
        ('JK', N'Jammu and Kashmir', 14),
        ('JH', N'Jharkhand', 15),
        ('KA', N'Karnataka', 16),
        ('KL', N'Kerala', 17),
        ('LA', N'Ladakh', 18),
        ('LD', N'Lakshadweep', 19),
        ('MP', N'Madhya Pradesh', 20),
        ('MH', N'Maharashtra', 21),
        ('MN', N'Manipur', 22),
        ('ML', N'Meghalaya', 23),
        ('MZ', N'Mizoram', 24),
        ('NL', N'Nagaland', 25),
        ('OD', N'Odisha', 26),
        ('PY', N'Puducherry', 27),
        ('PB', N'Punjab', 28),
        ('RJ', N'Rajasthan', 29),
        ('SK', N'Sikkim', 30),
        ('TN', N'Tamil Nadu', 31),
        ('TG', N'Telangana', 32),
        ('TR', N'Tripura', 33),
        ('UP', N'Uttar Pradesh', 34),
        ('UK', N'Uttarakhand', 35),
        ('WB', N'West Bengal', 36)
    ) AS v (Code, Name, SortOrder)
    INNER JOIN Countries c ON c.Code = 'IN';
END
GO
