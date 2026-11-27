// UI strings. Add a language here and in LANGS; screens read them through useT().
import { useApp } from './store';

export type Lang = 'ar' | 'en' | 'ur';
export const LANGS: { key: Lang; label: string; rtl: boolean }[] = [
  { key: 'ar', label: 'العربية', rtl: true },
  { key: 'en', label: 'English', rtl: false },
  { key: 'ur', label: 'اردو', rtl: true },
];

const S = {
  ar: {
    hello: 'هلا يا', district: 'حي النسيم · الرياض', home: 'الرئيسية', notebook: 'دفتري',
    confirmed: 'موعد مؤكد', pending: 'بانتظار التأكيد', viewPlan: 'عرض خطة الزيارة', rideTrack: 'متابعة طلب التوصيل',
    myCare: 'رعايتي', carePlan: 'خطة الرعاية', carePlanSub: 'من الحجز لين النتيجة', family: 'صحة العائلة', familySub: 'شجرة عائلتك',
    walk: 'ممشى الحي', walkSub: '6 دقايق مشي · 400 م', needle: 'وقت الإبرة؟', needleSub: 'وضع التشتيت', game: 'حيّ عون', gameSub: '300 عملة · ساعدي جيرانك',
    nbTitle: 'دفتري الصحي', nbDone: 'المكتمل من الفحوصات', tests: 'الفحوصات', results: 'النتائج', prefs: 'تفضيلاتي',
    fromDistrict: 'من حيّك', tips: 'نصائح الحي', resultsEmpty: 'نتايجك تطلع هنا لك أنتِ بس بعد ما يراجعها الطبيب.',
    assistantHint: 'تسمعك · اطلبي أي شي', assistantCall: '«يا {name}»', listening: 'أسمعك…', typeHere: 'اكتبي طلبك…', send: 'إرسال',
    incoming: 'مكالمة صوتية من عون', aoun: 'عون', screeningHelper: 'مساعد الفحص المبكر', accept: 'رد', decline: 'رفض',
    yourTurn: 'دورك في الحديث', connecting: 'لحظة، نوصلك…', typeReply: 'كتابة رد', mute: 'كتم', end: 'إنهاء',
    couldNotCall: 'ما قدرت أفتح المكالمة. تأكّدي من النت والمايك، وجرّبي مرة ثانية.',
    settings: 'الإعدادات', textSize: 'حجم الخط', language: 'اللغة', voice: 'صوت المساعد', female: 'رُفيدة', male: 'رفيد',
    privacy: 'خصوصيتك', privacyBody: 'ما نحفظ صوتك ولا محادثاتك. موقعك يُستخدم مرة وحدة وتُحفظ المسافة بس. نتايجك لك أنتِ بس.',
    soon: 'قريبًا', soonBody: 'نشتغل على هالصفحة.', back: 'رجوع', planTitle: 'خطة الزيارة', openMaps: 'افتحي في الخرائط',
    locTitle: 'السماح لـ«عون» باستخدام موقعك؟', locBody: 'نستخدمه مرة وحدة عشان نرتّب أقرب مكان. ما تُحفظ إحداثياتك.', allow: 'السماح', dontAllow: 'عدم السماح',
    bookAppt: 'رتّبي موعدي', companion: 'المرافق', companionNote: 'يوصله التذكير بس، ونتايجك لك أنتِ.', familyNote: 'الشجرة تبين صلة القرابة بس، وما تربط أي مرض بأي شخص.',
    smaller: 'أصغر', normal: 'عادي', bigger: 'أكبر',
  },
  en: {
    hello: 'Hi', district: 'Al-Naseem · Riyadh', home: 'Home', notebook: 'Notebook',
    confirmed: 'Appointment confirmed', pending: 'Awaiting confirmation', viewPlan: 'View visit plan', rideTrack: 'Track your ride',
    myCare: 'My care', carePlan: 'Care plan', carePlanSub: 'From booking to result', family: 'Family health', familySub: 'Your family tree',
    walk: 'Neighbourhood walk', walkSub: '6 min walk · 400 m', needle: 'Needle time?', needleSub: 'Distraction mode', game: 'Aoun district', gameSub: '300 coins · help neighbours',
    nbTitle: 'My health notebook', nbDone: 'Screenings done', tests: 'Screenings', results: 'Results', prefs: 'Preferences',
    fromDistrict: 'From your district', tips: 'District tips', resultsEmpty: 'Your results appear here, only for you, after a doctor reviews them.',
    assistantHint: 'is listening · ask anything', assistantCall: '“Hey {name}”', listening: 'Listening…', typeHere: 'Type your request…', send: 'Send',
    incoming: 'Voice call from Aoun', aoun: 'Aoun', screeningHelper: 'Early screening helper', accept: 'Accept', decline: 'Decline',
    yourTurn: 'Your turn to speak', connecting: 'Connecting…', typeReply: 'Type a reply', mute: 'Mute', end: 'End',
    couldNotCall: 'Could not start the call. Check your connection and microphone, then try again.',
    settings: 'Settings', textSize: 'Text size', language: 'Language', voice: 'Assistant voice', female: 'Rufaida', male: 'Rafeed',
    privacy: 'Your privacy', privacyBody: 'We never store your voice or conversations. Your location is used once; only the distance is kept. Your results are yours alone.',
    soon: 'Coming soon', soonBody: 'We are working on this page.', back: 'Back', planTitle: 'Visit plan', openMaps: 'Open in Maps',
    locTitle: 'Allow “Aoun” to use your location?', locBody: 'Used once to find the nearest place. Your coordinates are not stored.', allow: 'Allow', dontAllow: 'Don’t allow',
    bookAppt: 'Book my appointment', companion: 'Companion', companionNote: 'Gets reminders only; your results stay yours.', familyNote: 'The tree shows relationships only and never links an illness to a person.',
    smaller: 'Smaller', normal: 'Normal', bigger: 'Bigger',
  },
  ur: {
    hello: 'السلام علیکم', district: 'النسیم · ریاض', home: 'ہوم', notebook: 'میری نوٹ بک',
    confirmed: 'اپوائنٹمنٹ کنفرم', pending: 'تصدیق کا انتظار', viewPlan: 'وزٹ پلان دیکھیں', rideTrack: 'سواری ٹریک کریں',
    myCare: 'میری دیکھ بھال', carePlan: 'کیئر پلان', carePlanSub: 'بکنگ سے نتیجے تک', family: 'خاندانی صحت', familySub: 'خاندانی درخت',
    walk: 'محلے کی سیر', walkSub: '6 منٹ پیدل · 400 میٹر', needle: 'انجکشن کا وقت؟', needleSub: 'توجہ ہٹانے کا موڈ', game: 'عون محلہ', gameSub: '300 سکے · پڑوسیوں کی مدد',
    nbTitle: 'میری صحت کی نوٹ بک', nbDone: 'مکمل اسکریننگ', tests: 'اسکریننگ', results: 'نتائج', prefs: 'ترجیحات',
    fromDistrict: 'آپ کے محلے سے', tips: 'محلے کے مشورے', resultsEmpty: 'ڈاکٹر کے دیکھنے کے بعد نتائج صرف آپ کے لیے یہاں آئیں گے۔',
    assistantHint: 'سن رہی ہیں · کچھ بھی پوچھیں', assistantCall: '«{name}»', listening: 'سن رہی ہوں…', typeHere: 'اپنی درخواست لکھیں…', send: 'بھیجیں',
    incoming: 'عون سے وائس کال', aoun: 'عون', screeningHelper: 'ابتدائی اسکریننگ مددگار', accept: 'جواب', decline: 'مسترد',
    yourTurn: 'آپ کی باری', connecting: 'جڑ رہا ہے…', typeReply: 'جواب لکھیں', mute: 'خاموش', end: 'ختم',
    couldNotCall: 'کال شروع نہیں ہو سکی۔ انٹرنیٹ اور مائیک چیک کر کے دوبارہ کوشش کریں۔',
    settings: 'ترتیبات', textSize: 'متن کا سائز', language: 'زبان', voice: 'اسسٹنٹ کی آواز', female: 'رفیدہ', male: 'رفید',
    privacy: 'آپ کی رازداری', privacyBody: 'ہم آپ کی آواز یا گفتگو محفوظ نہیں کرتے۔ مقام ایک بار استعمال ہوتا ہے، صرف فاصلہ رکھا جاتا ہے۔',
    soon: 'جلد آ رہا ہے', soonBody: 'ہم اس صفحے پر کام کر رہے ہیں۔', back: 'واپس', planTitle: 'وزٹ پلان', openMaps: 'نقشے میں کھولیں',
    locTitle: '«عون» کو مقام استعمال کرنے دیں؟', locBody: 'قریب ترین جگہ کے لیے ایک بار۔ کوآرڈینیٹس محفوظ نہیں ہوتے۔', allow: 'اجازت دیں', dontAllow: 'اجازت نہ دیں',
    bookAppt: 'میری اپوائنٹمنٹ بک کریں', companion: 'ساتھی', companionNote: 'صرف یاد دہانی ملتی ہے؛ نتائج آپ کے ہیں۔', familyNote: 'درخت صرف رشتے دکھاتا ہے، کسی بیماری کو کسی شخص سے نہیں جوڑتا۔',
    smaller: 'چھوٹا', normal: 'عام', bigger: 'بڑا',
  },
} as const;

export type Key = keyof typeof S.ar;

export function t(lang: Lang, key: Key, vars?: Record<string, string>): string {
  let s: string = (S[lang] as Record<Key, string>)[key] ?? S.ar[key];
  if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

export function useT() {
  const lang = useApp((s) => s.lang);
  const rtl = LANGS.find((l) => l.key === lang)?.rtl ?? true;
  return { lang, rtl, t: (key: Key, vars?: Record<string, string>) => t(lang, key, vars) };
}
