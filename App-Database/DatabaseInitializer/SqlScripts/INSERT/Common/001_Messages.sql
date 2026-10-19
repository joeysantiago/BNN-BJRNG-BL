IF NOT EXISTS (SELECT 1 FROM Messages)
BEGIN
    INSERT INTO Messages (Code, Texts)
    VALUES
        ('UNEXPECTED_ERROR', N'{"en":"Something went wrong. Please try again.","hi":"कुछ गलत हो गया। कृपया फिर से प्रयास करें।","ar":"حدث خطأ ما. يرجى المحاولة مرة أخرى."}'),
        ('SPEEDTEST_SIZE_INVALID', N'{"en":"The requested size must be between 0 and {0} bytes.","hi":"अनुरोधित आकार 0 से {0} बाइट के बीच होना चाहिए।","ar":"يجب أن يكون الحجم المطلوب بين 0 و {0} بايت."}'),
        ('MUSIC_PLAYER_NOT_FOUND', N'{"en":"This player was not found.","hi":"यह प्लेयर नहीं मिला।","ar":"لم يتم العثور على هذا المشغل."}'),
        ('MUSIC_TRACK_NOT_FOUND', N'{"en":"This track was not found.","hi":"यह ट्रैक नहीं मिला।","ar":"لم يتم العثور على هذا المقطع."}'),
        ('MUSIC_PASSWORD_INVALID', N'{"en":"The password is not correct.","hi":"पासवर्ड सही नहीं है।","ar":"كلمة المرور غير صحيحة."}'),
        ('MUSIC_FILE_TYPE_INVALID', N'{"en":"The file type {0} is not supported.","hi":"फ़ाइल प्रकार {0} समर्थित नहीं है।","ar":"نوع الملف {0} غير مدعوم."}'),
        ('MUSIC_NO_FILES', N'{"en":"Choose at least one audio file.","hi":"कम से कम एक ऑडियो फ़ाइल चुनें।","ar":"اختر ملف صوت واحدًا على الأقل."}'),
        ('MUSIC_FILE_MISSING', N'{"en":"The audio file is missing on the server.","hi":"ऑडियो फ़ाइल सर्वर पर उपलब्ध नहीं है।","ar":"ملف الصوت غير موجود على الخادم."}'),
        ('MUSIC_TRACKS_UPLOADED', N'{"en":"{0} track(s) added.","hi":"{0} ट्रैक जोड़े गए।","ar":"تمت إضافة {0} مقطع."}'),
        ('MUSIC_TRACK_DELETED', N'{"en":"The track was deleted.","hi":"ट्रैक हटा दिया गया।","ar":"تم حذف المقطع."}'),
        ('YOUTUBE_QUERY_REQUIRED', N'{"en":"Enter a search text.","hi":"खोजने के लिए कुछ लिखें।","ar":"أدخل نص البحث."}'),
        ('YOUTUBE_VIDEO_ID_INVALID', N'{"en":"This is not a valid video id.","hi":"यह मान्य वीडियो आईडी नहीं है।","ar":"معرّف الفيديو غير صالح."}'),
        ('YOUTUBE_PLAYLIST_ID_INVALID', N'{"en":"This is not a valid playlist id.","hi":"यह मान्य प्लेलिस्ट आईडी नहीं है।","ar":"معرّف قائمة التشغيل غير صالح."}'),
        ('YOUTUBE_LOOKUP_FAILED', N'{"en":"YouTube could not be reached for this request.","hi":"इस अनुरोध के लिए YouTube से संपर्क नहीं हो सका।","ar":"تعذر الوصول إلى يوتيوب لهذا الطلب."}'),
        ('YOUTUBE_NO_AUDIO', N'{"en":"No audio stream is available for this video.","hi":"इस वीडियो के लिए कोई ऑडियो स्ट्रीम उपलब्ध नहीं है।","ar":"لا يتوفر مسار صوتي لهذا الفيديو."}'),
        ('MUSIC_PASSWORD_CHANGED', N'{"en":"The password was changed.","hi":"पासवर्ड बदल दिया गया।","ar":"تم تغيير كلمة المرور."}'),
        ('MUSIC_PASSWORD_RESET', N'{"en":"The password was reset.","hi":"पासवर्ड रीसेट कर दिया गया।","ar":"تمت إعادة تعيين كلمة المرور."}'),
        ('MUSIC_PASSWORD_WEAK', N'{"en":"The new password must be 6 to 64 characters, with no spaces.","hi":"नया पासवर्ड 6 से 64 अक्षरों का होना चाहिए, बिना स्पेस के।","ar":"يجب أن تتكون كلمة المرور الجديدة من 6 إلى 64 حرفًا بدون مسافات."}'),
        ('MASTER_KEY_INVALID', N'{"en":"The admin password is not correct.","hi":"एडमिन पासवर्ड सही नहीं है।","ar":"كلمة مرور المشرف غير صحيحة."}'),
        ('TRANSLATION_LANGUAGE_INVALID', N'{"en":"This language is not supported.","hi":"यह भाषा समर्थित नहीं है।","ar":"هذه اللغة غير مدعومة."}'),
        ('TOO_MANY_REQUESTS', N'{"en":"Too many attempts. Please wait a minute and try again.","hi":"बहुत अधिक प्रयास। कृपया एक मिनट प्रतीक्षा करें और फिर प्रयास करें।","ar":"محاولات كثيرة جدًا. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى."}'),
        ('YOUTUBE_FFMPEG_MISSING', N'{"en":"MP3 conversion is not available on this server.","hi":"इस सर्वर पर MP3 रूपांतरण उपलब्ध नहीं है।","ar":"تحويل MP3 غير متاح على هذا الخادم."}'),
        ('MASTER_KEY_CREATED', N'{"en":"The admin password was saved.","hi":"एडमिन पासवर्ड सहेज लिया गया।","ar":"تم حفظ كلمة مرور المشرف."}'),
        ('MASTER_KEY_MISMATCH', N'{"en":"The two passwords do not match.","hi":"दोनों पासवर्ड मेल नहीं खाते।","ar":"كلمتا المرور غير متطابقتين."}'),
        ('MASTER_KEY_ALREADY_SET', N'{"en":"The admin password is already set.","hi":"एडमिन पासवर्ड पहले से सेट है।","ar":"كلمة مرور المشرف مضبوطة مسبقًا."}'),
        ('YOUTUBE_KEY_SAVED', N'{"en":"The YouTube API key was saved.","hi":"YouTube API कुंजी सहेज ली गई।","ar":"تم حفظ مفتاح YouTube API."}'),
        ('YOUTUBE_KEY_REJECTED', N'{"en":"YouTube did not accept this API key. Check the key and that the YouTube Data API v3 is enabled for it.","hi":"YouTube ने यह API कुंजी स्वीकार नहीं की। कुंजी जाँचें और देखें कि उसके लिए YouTube Data API v3 चालू है।","ar":"لم يقبل YouTube مفتاح API هذا. تحقق من المفتاح ومن تفعيل YouTube Data API v3 له."}'),
        ('SETTINGS_SAVED', N'{"en":"Settings saved.","hi":"सेटिंग्स सहेजी गईं।","ar":"تم حفظ الإعدادات."}'),
        ('SETTINGS_INVALID', N'{"en":"Some of the settings are not valid.","hi":"कुछ सेटिंग्स मान्य नहीं हैं।","ar":"بعض الإعدادات غير صالحة."}');
END
GO
