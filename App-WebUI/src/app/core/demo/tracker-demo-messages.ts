import { DemoMessages } from './demo.model';

/**
 * The SnapTracker texts the API would answer with (TRACKER_* rows of the Messages table, INSERT/Common/001_Messages.sql, to be added with the API work),
 * plus the demo's own (TRACKER_DEMO_*). Loaded with the SnapTracker part of the demo backend only.
 */
export const TRACKER_DEMO_MESSAGES: DemoMessages = {
  TRACKER_ADDED: { en: 'Transaction added.', hi: 'लेन-देन जोड़ा गया।', ar: 'تمت إضافة المعاملة.' },
  TRACKER_SAVED: { en: 'Transaction saved.', hi: 'लेन-देन सहेजा गया।', ar: 'تم حفظ المعاملة.' },
  TRACKER_CONFIRMED: { en: 'Transaction confirmed.', hi: 'लेन-देन की पुष्टि हो गई।', ar: 'تم تأكيد المعاملة.' },
  TRACKER_IGNORED: { en: 'Transaction ignored. It is not counted in your totals.', hi: 'लेन-देन अनदेखा किया गया। यह आपके कुल में नहीं गिना जाएगा।', ar: 'تم تجاهل المعاملة. لن تُحتسب في إجمالياتك.' },
  TRACKER_RESTORED: { en: 'Transaction restored.', hi: 'लेन-देन वापस लाया गया।', ar: 'تمت استعادة المعاملة.' },
  TRACKER_NOT_DUPLICATE: { en: 'Marked as not a duplicate. It now waits for your check.', hi: 'डुप्लिकेट नहीं के रूप में चिह्नित किया गया। अब यह आपकी जाँच की प्रतीक्षा में है।', ar: 'تم وضع علامة "ليست مكررة". إنها الآن بانتظار مراجعتك.' },
  TRACKER_CATEGORY_SAVED: { en: 'Category changed.', hi: 'श्रेणी बदल दी गई।', ar: 'تم تغيير الفئة.' },
  TRACKER_CATEGORY_RULE: { en: 'Category changed. {0} will always go to this category.', hi: 'श्रेणी बदल दी गई। {0} हमेशा इसी श्रेणी में जाएगा।', ar: 'تم تغيير الفئة. سيُصنَّف {0} دائمًا ضمن هذه الفئة.' },
  TRACKER_DELETED: { en: 'Transaction deleted.', hi: 'लेन-देन हटाया गया।', ar: 'تم حذف المعاملة.' },
  TRACKER_INVALID: { en: 'Some details are not valid. Please check and try again.', hi: 'कुछ विवरण मान्य नहीं हैं। कृपया जांचें और फिर से प्रयास करें।', ar: 'بعض التفاصيل غير صالحة. يرجى التحقق والمحاولة مرة أخرى.' },
  TRACKER_NOT_FOUND: { en: 'This transaction was not found.', hi: 'यह लेन-देन नहीं मिला।', ar: 'لم يتم العثور على هذه المعاملة.' },
  TRACKER_SMS_EMPTY: { en: 'Paste the text of a bank or UPI SMS first.', hi: 'पहले किसी बैंक या UPI SMS का टेक्स्ट पेस्ट करें।', ar: 'الصق نص رسالة بنك أو UPI أولًا.' },
  TRACKER_SMS_TOO_LONG: { en: 'An SMS can be at most {0} characters long.', hi: 'एक SMS अधिकतम {0} अक्षरों का हो सकता है।', ar: 'يمكن أن تصل الرسالة إلى {0} حرفًا كحد أقصى.' },
  TRACKER_TRACKING_ON: { en: 'SMS tracking is on.', hi: 'SMS ट्रैकिंग चालू है।', ar: 'تم تشغيل تتبع الرسائل.' },
  TRACKER_TRACKING_PAUSED: { en: 'SMS tracking is paused.', hi: 'SMS ट्रैकिंग रोकी गई।', ar: 'تم إيقاف تتبع الرسائل مؤقتًا.' },
  TRACKER_TRACKING_RESUMED: { en: 'SMS tracking is on again.', hi: 'SMS ट्रैकिंग फिर से चालू है।', ar: 'تم استئناف تتبع الرسائل.' },
  TRACKER_TRACKING_REVOKED: { en: 'SMS access was revoked. Nothing more is read.', hi: 'SMS एक्सेस हटा दिया गया। अब कुछ नहीं पढ़ा जाएगा।', ar: 'تم إلغاء الوصول إلى الرسائل. لن تتم قراءة أي شيء بعد الآن.' },
  TRACKER_SETTINGS_SAVED: { en: 'SnapTracker settings saved.', hi: 'SnapTracker सेटिंग्स सहेजी गईं।', ar: 'تم حفظ إعدادات SnapTracker.' },
  TRACKER_ALERTS_READ: { en: 'All alerts marked as read.', hi: 'सभी अलर्ट पढ़े गए के रूप में चिह्नित।', ar: 'تم وضع علامة "مقروء" على كل التنبيهات.' },
  TRACKER_SMS_TEXTS_DELETED: { en: 'Original SMS texts deleted. Your transactions stay.', hi: 'मूल SMS टेक्स्ट हटा दिए गए। आपके लेन-देन बने रहेंगे।', ar: 'تم حذف نصوص الرسائل الأصلية. تبقى معاملاتك.' },
  TRACKER_DATA_DELETED: { en: 'All your SnapTracker data was deleted.', hi: 'आपका सारा SnapTracker डेटा हटा दिया गया।', ar: 'تم حذف كل بياناتك في SnapTracker.' },
  TRACKER_DEMO_SAMPLE_LOADED: { en: 'Demo: {0} sample transactions from the last 6 months were added.', hi: 'डेमो: पिछले 6 महीनों के {0} नमूना लेन-देन जोड़े गए।', ar: 'عرض تجريبي: تمت إضافة {0} معاملة نموذجية من آخر 6 أشهر.' },
};
