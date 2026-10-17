IF NOT EXISTS (SELECT 1 FROM PageNames)
BEGIN
    INSERT INTO PageNames (PageCode, LanguageCode, Name)
    VALUES
        ('speed', 'en', N'Speed test'),
        ('speed', 'hi', N'स्पीड टेस्ट'),
        ('speed', 'ar', N'اختبار السرعة'),
        ('connection', 'en', N'Your connection details'),
        ('connection', 'hi', N'आपके कनेक्शन का विवरण'),
        ('connection', 'ar', N'تفاصيل اتصالك'),
        ('services', 'en', N'Services status'),
        ('services', 'hi', N'सेवाओं की स्थिति'),
        ('services', 'ar', N'حالة الخدمات'),
        ('about', 'en', N'About'),
        ('about', 'hi', N'हमारे बारे में'),
        ('about', 'ar', N'حول الموقع'),
        ('privacy', 'en', N'Privacy'),
        ('privacy', 'hi', N'गोपनीयता'),
        ('privacy', 'ar', N'الخصوصية'),
        ('terms', 'en', N'Terms'),
        ('terms', 'hi', N'शर्तें'),
        ('terms', 'ar', N'الشروط'),
        ('creta', 'en', N'Creta audio'),
        ('creta', 'hi', N'क्रेटा ऑडियो'),
        ('creta', 'ar', N'مشغل كريتا'),
        ('nexon', 'en', N'Nexon audio'),
        ('nexon', 'hi', N'नेक्सॉन ऑडियो'),
        ('nexon', 'ar', N'مشغل نيكسون'),
        ('hr', 'en', N'Atrium HR'),
        ('hr', 'hi', N'एट्रियम एचआर'),
        ('hr', 'ar', N'أتريوم للموارد البشرية');
END
GO
