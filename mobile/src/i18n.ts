// Every word the app shows, in the 7 languages the agents speak. The app follows the language the
// person speaks (see voice/detectLang.ts) or picks in settings. Arabic and Urdu read right to left.
import { useApp } from './store';

export type Lang = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil' | 'id';
export const LANGS: { key: Lang; label: string; rtl: boolean; locale: string; speech: string }[] = [
  { key: 'ar', label: 'العربية', rtl: true, locale: 'ar-SA-u-nu-latn', speech: 'ar-SA' },
  { key: 'en', label: 'English', rtl: false, locale: 'en-GB', speech: 'en-US' },
  { key: 'ur', label: 'اردو', rtl: true, locale: 'ur-PK', speech: 'ur-PK' },
  { key: 'hi', label: 'हिन्दी', rtl: false, locale: 'hi-IN', speech: 'hi-IN' },
  { key: 'bn', label: 'বাংলা', rtl: false, locale: 'bn-BD', speech: 'bn-BD' },
  { key: 'fil', label: 'Filipino', rtl: false, locale: 'fil-PH', speech: 'fil-PH' },
  { key: 'id', label: 'Indonesia', rtl: false, locale: 'id-ID', speech: 'id-ID' },
];

const ar = {
  wName: 'الاسم', wId: 'رقم الهوية', wPhone: 'الجوال', wReady: 'حسابك جاهز من «صحتي»، بدون أي تسجيل.', wSafe: 'بياناتك مشفّرة، وما تُشارك مع أحد', wEnter: 'الدخول إلى عون', assistantMenu: 'كل اللي أقدر أسويه لك',
  home: 'الرئيسية', notebook: 'دفتري', meds: 'أدويتي', back: 'رجوع', settings: 'الإعدادات', soon: 'قريبًا', soonBody: 'نشتغل على هالصفحة.',
  send: 'إرسال', cancel: 'إلغاء', confirm: 'تأكيد', loading: 'لحظة…', retry: 'جرّبي مرة ثانية', offline: 'ما قدرنا نوصل لعون. تأكّدي من النت.',
  hello: 'هلا يا', confirmed: 'موعد مؤكد', pending: 'بانتظار التأكيد', noBooking: 'ما عندك موعد للحين', viewPlan: 'عرض خطة الزيارة',
  bookAppt: 'رتّبي موعدي مع عون', pickTime: 'اختاري موعد بنفسك', rideTrack: 'المشوار: أوبر ودرب والخريطة', myCare: 'رعايتي',
  carePlan: 'خطة الرعاية', carePlanSub: 'من الحجز لين النتيجة', family: 'صحة العائلة', familySub: 'التاريخ العائلي والفحوصات',
  walk: 'ممشى الحي', walkSub: '6 دقايق مشي · 400 م', needle: 'وقت الإبرة؟', needleSub: 'وضع التشتيت', game: 'حيّ عون', gameSub: 'ساعدي جيرانك',
  messages: 'رسائل الطبيب', messagesSub: 'اسألي طبيبك', record: 'سجلي الصحي', recordSub: 'كل تقاريرك من كل مكان',
  planTitle: 'خطة الزيارة', doctor: 'الطبيب', clinic: 'العيادة', center: 'المكان', trip: 'المشوار', prefs: 'تفضيلاتك',
  changeAppt: 'غيّري الموعد', cancelAppt: 'إلغاء الموعد', cancelAsk: 'متأكدة تبين تلغين الموعد؟', directions: 'الاتجاهات في قوقل ماب',
  uber: 'اطلبي أوبر للمركز', darb: 'تطبيق درب', transit: 'المسار بالمترو', homeVisit: 'في بيتك، الفريق يجيك',
  mobileClinic: 'العيادة المتنقلة عند جامع الحي', femaleStaff: 'طبيبة', wheelchair: 'يدعم الكرسي المتحرك',
  stepBooked: 'تم الحجز', stepBookedSub: 'من عون', stepReminder: 'التذكير', stepReminderSub: 'قبلها بيوم', stepTrip: 'المشوار',
  stepTripSub: 'السيارة أو المترو', stepTest: 'الفحص', stepReview: 'الطبيب يراجع النتيجة', stepReviewSub: 'خلال يومين',
  stepResult: 'النتيجة والخطة الجاية', stepResultSub: 'لك أنتِ بس', rideCar: 'سيارة تمرّك الساعة {t}', rideMetro: 'بالمترو من محطة الحي',
  companionOn: 'مرافق من العائلة يوصله التذكير',
  bookingTitle: 'المواعيد المتاحة', femaleOnly: 'طبيبة فقط', noSlots: 'ما فيه مواعيد متاحة بهالفلتر.', bookThis: 'احجزي هالموعد',
  bookAsk: 'نحجز لك {when} عند {doctor}؟', booked: 'تم حجز موعدك', slotTaken: 'انحجز هالموعد قبل شوي، اختاري غيره.', placesLeft: '{n} متبقي',
  nbTitle: 'دفتري الصحي', nbDone: 'المكتمل من الفحوصات', tests: 'الفحوصات', results: 'نتائجي', fullRecord: 'السجل الكامل',
  doctorNotes: 'ملاحظات الطبيب', files: 'المرفقات', noResults: 'نتايجك تطلع هنا لك أنتِ بس بعد ما يراجعها الطبيب.',
  due: 'مستحق', done: 'تم', recommended: 'موصى به', normal: 'طبيعي', borderline: 'حدّي', high: 'مرتفع', low: 'منخفض',
  positive: 'إيجابي', negative: 'سلبي', range: 'الطبيعي {a}–{b}', openFile: 'فتح الملف',
  recordTitle: 'سجلي الصحي', recordNote: 'كل تقاريرك ونتائجك من المستشفيات والعيادات والمختبرات في مكان واحد، لك أنتِ. الطبيب اللي تحجزين عنده بس يقدر يشوفها.',
  filterAll: 'الكل', filterAoun: 'عون', filterHospitals: 'مستشفيات', filterClinics: 'عيادات', filterLabs: 'مختبرات',
  referrals: 'الإحالات', geneticReferral: 'إحالة لاستشارة وراثية', specialistReferral: 'إحالة لمختص',
  accessLog: 'مين اطّلع على سجلي', accessLogEmpty: 'ما أحد اطّلع على سجلك.', viewed_record: 'فتح سجلك', added_result: 'أضاف نتيجة',
  added_note: 'أضاف ملاحظة', added_file: 'أرفق ملف', added_medicine: 'أضاف دواء', stopped_medicine: 'أوقف دواء',
  medsTitle: 'أدويتي وفيتاميناتي', active: 'الحالية', past: 'السابقة', ongoing: 'مستمر', days: '{n} يوم', withFood: 'بعد الأكل',
  remindersOn: 'التذكيرات شغّالة', enableReminders: 'شغّلي التذكيرات', noMeds: 'ما عندك أدوية أو فيتامينات حاليًا.',
  medReminderTitle: 'وقت {name}', medReminderBody: '{dose}{food}', medication: 'دواء', vitamin: 'فيتامين', supplement: 'مكمّل',
  messagesTitle: 'رسائل الطبيب', typeMessage: 'اكتبي رسالتك…', noDoctor: 'تقدرين تراسلين طبيبك بعد ما تحجزين موعد.',
  familyTitle: 'صحة العائلة', familyHistory: 'التاريخ العائلي', familyHistoryNote: 'اختاري اللي في عائلتك. ما نسأل مين، ولا نربط أي مرض بأي شخص.',
  recommendedTests: 'فحوصات موصى فيها لك', every: 'كل {n} شهر', warningSigns: 'لا تنتظرين الفحص الدوري إذا لاحظتي',
  urgent: 'راجعي الطوارئ', soonLbl: 'كلّمي طبيبك قريب', emergency: 'اتصلي ٩٩٧',
  textSize: 'حجم الخط', language: 'اللغة', voice: 'صوت المساعد', female: 'رُفيدة', male: 'رفيد',
  privacy: 'خصوصيتك', privacyBody: 'ما نحفظ صوتك ولا محادثاتك. موقعك يُستخدم مرة وحدة وتُحفظ المسافة بس. نتايجك لك أنتِ والطبيب اللي تحجزين عنده.',
  normalSize: 'عادي', bigger: 'أكبر',
  incoming: 'مكالمة صوتية من عون', aoun: 'عون', screeningHelper: 'مساعد الفحص المبكر', accept: 'رد', decline: 'رفض',
  yourTurn: 'دورك في الحديث', connecting: 'لحظة، نوصلك…', typeReply: 'كتابة رد', mute: 'كتم', end: 'إنهاء',
  couldNotCall: 'ما قدرت أفتح المكالمة. تأكّدي من النت والمايك، وجرّبي مرة ثانية.',
  locTitle: 'السماح لـ«عون» باستخدام موقعك؟', locBody: 'نستخدمه مرة وحدة عشان نرتّب أقرب مكان. ما تُحفظ إحداثياتك.', allow: 'السماح', dontAllow: 'عدم السماح',
  assistantHint: 'تسمعك · اطلبي أي شي', assistantCall: '«يا {name}»', typeHere: 'اكتبي طلبك…',
  free: 'مجاني', freeSehhaty: 'مجاني · محجوز عبر صحتي', youPay: 'عليك {n} ريال', priceLbl: 'السعر', insurancePays: 'يغطيه التأمين', youPayLbl: 'عليك',
  privateClinic: 'عيادة خاصة', costTitle: 'التكلفة', sehhatyRef: 'رقم الموعد في صحتي', sehhatyAccount: 'حسابي في صحتي', linked: 'مربوط',
  idType: 'الهوية', insurance: 'التأمين', noInsurance: 'ما فيه تأمين مسجّل', insClass: 'فئة {c} · نسبة التحمّل {p}٪ (بحد أقصى {cap} ريال)', validUntil: 'ساري حتى {d}',
  demoProfile: 'جرّبي كـ (نسخة تجريبية)', pCitizen: 'مواطنة بدون تأمين', pCitizenIns: 'مواطنة مع تأمين', pResidentIns: 'مقيمة مع تأمين', pResidentNo: 'مقيمة بدون تأمين',
  sehhatyNote: 'المواعيد تنحجز في صحتي، وبياناتك تجي من صحتي. ما نطلب منك رقم هويتك أبد.', virtualConsult: 'استشارة فيديو مع طبيبة قبل الفحص (مجانية عبر صحتي)', showPrivate: 'أظهري العيادات الخاصة (مدفوعة)',
  translatedLbl: 'مترجمة', showOriginal: 'عرض الأصل', showTranslation: 'عرض الترجمة',
  tips: 'نصائح', fromDistrict: 'من حيّك', noPrefs: 'ما فيه تفضيلات مسجّلة', save: 'حفظ', saved: 'تم الحفظ', steps: 'الخطوات',
  reminderSet: 'تم ضبط {n} تذكير على جوالك', remindersOff: 'التذكيرات طافية', myDistrict: 'حيّي', allDistricts: 'كل الأحياء',
  byDoctor: 'من {name}', nextDue: 'الجاي', lastDone: 'آخر مرة {d}', thread: 'المحادثة', you: 'أنتِ', noMessages: 'ابدئي المحادثة مع طبيبك.',
  takeAt: 'المواعيد', fromPlace: 'من {place}', openIn: 'افتحي في', tripTitle: 'المشوار',
  apptReminderTitle: 'موعدك بكرة', apptReminderBody: '{when} في {place}', companion: 'المرافق', companionNote: 'يوصله التذكير بس، ونتايجك لك أنتِ.',
};
type Dict = typeof ar;
export type Key = keyof Dict;

const en: Dict = {
  wName: 'Name', wId: 'ID number', wPhone: 'Mobile', wReady: 'Your account is ready from Sehhaty. No sign-up needed.', wSafe: 'Your details are encrypted and never shared', wEnter: 'Enter Aoun', assistantMenu: 'Everything I can do for you',
  home: 'Home', notebook: 'Notebook', meds: 'Medicines', back: 'Back', settings: 'Settings', soon: 'Coming soon', soonBody: 'We are working on this page.',
  send: 'Send', cancel: 'Cancel', confirm: 'Confirm', loading: 'One moment…', retry: 'Try again', offline: 'Could not reach Aoun. Check your connection.',
  hello: 'Hi', confirmed: 'Appointment confirmed', pending: 'Awaiting confirmation', noBooking: 'No appointment yet', viewPlan: 'View visit plan',
  bookAppt: 'Arrange it with Aoun', pickTime: 'Pick a time yourself', rideTrack: 'Getting there: Uber, Darb and the map', myCare: 'My care',
  carePlan: 'Care plan', carePlanSub: 'From booking to result', family: 'Family health', familySub: 'Family history and screenings',
  walk: 'Neighbourhood walk', walkSub: '6 min walk · 400 m', needle: 'Needle time?', needleSub: 'Distraction mode', game: 'Aoun district', gameSub: 'Help your neighbours',
  messages: 'Doctor messages', messagesSub: 'Ask your doctor', record: 'My health record', recordSub: 'All your reports, from everywhere',
  planTitle: 'Visit plan', doctor: 'Doctor', clinic: 'Clinic', center: 'Place', trip: 'Getting there', prefs: 'Your preferences',
  changeAppt: 'Change time', cancelAppt: 'Cancel appointment', cancelAsk: 'Cancel this appointment?', directions: 'Directions in Google Maps',
  uber: 'Get an Uber to the center', darb: 'Darb app', transit: 'Route by metro', homeVisit: 'At your home, the team comes to you',
  mobileClinic: 'Mobile clinic by the district mosque', femaleStaff: 'Female doctor', wheelchair: 'Wheelchair accessible',
  stepBooked: 'Booked', stepBookedSub: 'by Aoun', stepReminder: 'Reminder', stepReminderSub: 'the day before', stepTrip: 'Getting there',
  stepTripSub: 'car or metro', stepTest: 'The test', stepReview: 'Doctor reviews the result', stepReviewSub: 'within two days',
  stepResult: 'Result and next plan', stepResultSub: 'only for you', rideCar: 'A car picks you up at {t}', rideMetro: 'By metro from the district station',
  companionOn: 'A family companion gets the reminder',
  bookingTitle: 'Open times', femaleOnly: 'Female doctor only', noSlots: 'No open times for this filter.', bookThis: 'Book this time',
  bookAsk: 'Book {when} with {doctor}?', booked: 'Your appointment is booked', slotTaken: 'That time was just taken. Please pick another.', placesLeft: '{n} left',
  nbTitle: 'My health notebook', nbDone: 'Screenings done', tests: 'Screenings', results: 'My results', fullRecord: 'Full record',
  doctorNotes: "Doctor's notes", files: 'Attachments', noResults: 'Your results appear here, only for you, after the doctor reviews them.',
  due: 'Due', done: 'Done', recommended: 'Recommended', normal: 'Normal', borderline: 'Borderline', high: 'High', low: 'Low',
  positive: 'Positive', negative: 'Negative', range: 'Normal {a}–{b}', openFile: 'Open file',
  recordTitle: 'My health record', recordNote: 'All your reports and results from hospitals, clinics and labs in one place, for you. Only the doctor you book with can see them.',
  filterAll: 'All', filterAoun: 'Aoun', filterHospitals: 'Hospitals', filterClinics: 'Clinics', filterLabs: 'Labs',
  referrals: 'Referrals', geneticReferral: 'Referral to genetic counselling', specialistReferral: 'Referral to a specialist',
  accessLog: 'Who opened my record', accessLogEmpty: 'No one has opened your record.', viewed_record: 'opened your record', added_result: 'added a result',
  added_note: 'added a note', added_file: 'attached a file', added_medicine: 'added a medicine', stopped_medicine: 'stopped a medicine',
  medsTitle: 'Medicines and vitamins', active: 'Current', past: 'Past', ongoing: 'Ongoing', days: '{n} days', withFood: 'after food',
  remindersOn: 'Reminders are on', enableReminders: 'Turn on reminders', noMeds: 'No medicines or vitamins right now.',
  medReminderTitle: 'Time for {name}', medReminderBody: '{dose}{food}', medication: 'Medicine', vitamin: 'Vitamin', supplement: 'Supplement',
  messagesTitle: 'Doctor messages', typeMessage: 'Write a message…', noDoctor: 'You can message your doctor once you book.',
  familyTitle: 'Family health', familyHistory: 'Family history', familyHistoryNote: 'Tick what runs in your family. We never ask who, and never link an illness to a person.',
  recommendedTests: 'Screenings recommended for you', every: 'every {n} months', warningSigns: "Don't wait for the routine screening if you notice",
  urgent: 'Go to the emergency department', soonLbl: 'Talk to your doctor soon', emergency: 'Call 997',
  textSize: 'Text size', language: 'Language', voice: 'Assistant voice', female: 'Rufaida', male: 'Rafeed',
  privacy: 'Your privacy', privacyBody: 'We never store your voice or conversations. Your location is used once; only the distance is kept. Your results are for you and the doctor you book with.',
  normalSize: 'Normal', bigger: 'Bigger',
  incoming: 'Voice call from Aoun', aoun: 'Aoun', screeningHelper: 'Early screening helper', accept: 'Accept', decline: 'Decline',
  yourTurn: 'Your turn to speak', connecting: 'Connecting…', typeReply: 'Type a reply', mute: 'Mute', end: 'End',
  couldNotCall: 'Could not start the call. Check your connection and microphone, then try again.',
  locTitle: 'Allow “Aoun” to use your location?', locBody: 'Used once to find the nearest place. Your coordinates are not stored.', allow: 'Allow', dontAllow: 'Don’t allow',
  assistantHint: 'is listening · ask anything', assistantCall: '“Hey {name}”', typeHere: 'Type your request…',
  free: 'Free', freeSehhaty: 'Free · booked through Sehhaty', youPay: 'You pay SAR {n}', priceLbl: 'Price', insurancePays: 'Insurance pays', youPayLbl: 'You pay',
  privateClinic: 'Private clinic', costTitle: 'Cost', sehhatyRef: 'Sehhaty appointment no.', sehhatyAccount: 'My Sehhaty account', linked: 'Linked',
  idType: 'Identity', insurance: 'Insurance', noInsurance: 'No insurance on record', insClass: 'Class {c} · {p}% co-pay (up to SAR {cap})', validUntil: 'valid until {d}',
  demoProfile: 'Try as (demo)', pCitizen: 'Citizen, no insurance', pCitizenIns: 'Citizen with insurance', pResidentIns: 'Resident with insurance', pResidentNo: 'Resident, no insurance',
  sehhatyNote: 'Appointments are booked in Sehhaty and your details come from Sehhaty. We never ask for your ID number.', virtualConsult: 'Video consultation with a doctor before the test (free through Sehhaty)', showPrivate: 'Show private clinics (paid)',
  translatedLbl: 'Translated', showOriginal: 'Show original', showTranslation: 'Show translation',
  tips: 'Tips', fromDistrict: 'From your district', noPrefs: 'No preferences saved', save: 'Save', saved: 'Saved', steps: 'Steps',
  reminderSet: '{n} reminders set on your phone', remindersOff: 'Reminders are off', myDistrict: 'My district', allDistricts: 'All districts',
  byDoctor: 'from {name}', nextDue: 'Next', lastDone: 'Last done {d}', thread: 'Conversation', you: 'You', noMessages: 'Start the conversation with your doctor.',
  takeAt: 'Times', fromPlace: 'from {place}', openIn: 'Open in', tripTitle: 'Getting there',
  apptReminderTitle: 'Your appointment is tomorrow', apptReminderBody: '{when} at {place}', companion: 'Companion', companionNote: 'Gets reminders only; your results stay yours.',
};

const ur: Dict = {
  ...en,
  home: 'ہوم', notebook: 'میری نوٹ بک', meds: 'میری دوائیں', back: 'واپس', settings: 'ترتیبات', soon: 'جلد آ رہا ہے', soonBody: 'ہم اس صفحے پر کام کر رہے ہیں۔',
  send: 'بھیجیں', cancel: 'منسوخ', confirm: 'تصدیق', loading: 'ایک لمحہ…', retry: 'دوبارہ کوشش کریں', offline: 'عون سے رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کریں۔',
  hello: 'السلام علیکم', confirmed: 'اپوائنٹمنٹ کنفرم', pending: 'تصدیق کا انتظار', noBooking: 'ابھی کوئی اپوائنٹمنٹ نہیں', viewPlan: 'وزٹ پلان دیکھیں',
  bookAppt: 'عون کے ساتھ طے کریں', pickTime: 'خود وقت چنیں', rideTrack: 'پہنچنا: اوبر، درب اور نقشہ', myCare: 'میری دیکھ بھال',
  carePlan: 'کیئر پلان', carePlanSub: 'بکنگ سے نتیجے تک', family: 'خاندانی صحت', familySub: 'خاندانی تاریخ اور اسکریننگ',
  messages: 'ڈاکٹر کے پیغامات', messagesSub: 'اپنے ڈاکٹر سے پوچھیں', record: 'میرا صحت ریکارڈ', recordSub: 'ہر جگہ سے آپ کی تمام رپورٹس',
  planTitle: 'وزٹ پلان', doctor: 'ڈاکٹر', clinic: 'کلینک', center: 'جگہ', trip: 'پہنچنا', prefs: 'آپ کی ترجیحات',
  changeAppt: 'وقت بدلیں', cancelAppt: 'اپوائنٹمنٹ منسوخ کریں', cancelAsk: 'کیا یہ اپوائنٹمنٹ منسوخ کریں؟', directions: 'گوگل میپس میں راستہ',
  uber: 'سینٹر کے لیے اوبر', darb: 'درب: میٹرو اور بس', transit: 'میٹرو سے راستہ', homeVisit: 'آپ کے گھر، ٹیم آئے گی',
  bookingTitle: 'دستیاب اوقات', femaleOnly: 'صرف خاتون ڈاکٹر', noSlots: 'اس فلٹر کے لیے کوئی وقت نہیں۔', bookThis: 'یہ وقت بک کریں',
  bookAsk: '{when} کو {doctor} کے ساتھ بک کریں؟', booked: 'آپ کی اپوائنٹمنٹ بک ہو گئی', slotTaken: 'یہ وقت ابھی بک ہو گیا۔ دوسرا چنیں۔', placesLeft: '{n} باقی',
  nbTitle: 'میری صحت کی نوٹ بک', nbDone: 'مکمل اسکریننگ', tests: 'اسکریننگ', results: 'میرے نتائج', fullRecord: 'مکمل ریکارڈ',
  doctorNotes: 'ڈاکٹر کے نوٹس', files: 'منسلکات', noResults: 'ڈاکٹر کے دیکھنے کے بعد نتائج صرف آپ کے لیے یہاں آئیں گے۔',
  due: 'باقی', done: 'مکمل', recommended: 'تجویز کردہ', normal: 'نارمل', borderline: 'سرحدی', high: 'زیادہ', low: 'کم', openFile: 'فائل کھولیں',
  recordTitle: 'میرا صحت ریکارڈ', recordNote: 'ہسپتالوں، کلینکس اور لیبز کی تمام رپورٹس ایک جگہ، صرف آپ کے لیے۔ صرف وہ ڈاکٹر دیکھ سکتا ہے جس سے آپ بک کریں۔',
  filterAll: 'سب', filterHospitals: 'ہسپتال', filterClinics: 'کلینک', filterLabs: 'لیبز', referrals: 'ریفرل', accessLog: 'میرا ریکارڈ کس نے کھولا',
  medsTitle: 'دوائیں اور وٹامنز', active: 'موجودہ', past: 'سابقہ', ongoing: 'جاری', days: '{n} دن', withFood: 'کھانے کے بعد',
  remindersOn: 'یاد دہانیاں آن ہیں', enableReminders: 'یاد دہانیاں آن کریں', noMeds: 'ابھی کوئی دوا یا وٹامن نہیں۔', medReminderTitle: '{name} کا وقت',
  messagesTitle: 'ڈاکٹر کے پیغامات', typeMessage: 'پیغام لکھیں…', noDoctor: 'بکنگ کے بعد آپ ڈاکٹر کو پیغام بھیج سکتے ہیں۔',
  familyTitle: 'خاندانی صحت', familyHistory: 'خاندانی تاریخ', familyHistoryNote: 'جو بیماری خاندان میں ہو، چنیں۔ ہم کبھی نہیں پوچھتے کون۔',
  recommendedTests: 'آپ کے لیے تجویز کردہ اسکریننگ', warningSigns: 'اگر یہ محسوس ہو تو معمول کی اسکریننگ کا انتظار نہ کریں',
  textSize: 'متن کا سائز', language: 'زبان', voice: 'اسسٹنٹ کی آواز', female: 'رفیدہ', male: 'رفید', privacy: 'آپ کی رازداری',
  privacyBody: 'ہم آپ کی آواز یا گفتگو محفوظ نہیں کرتے۔ مقام ایک بار استعمال ہوتا ہے، صرف فاصلہ رکھا جاتا ہے۔', normalSize: 'عام', bigger: 'بڑا',
  incoming: 'عون سے وائس کال', aoun: 'عون', screeningHelper: 'ابتدائی اسکریننگ مددگار', accept: 'جواب', decline: 'مسترد',
  yourTurn: 'آپ کی باری', connecting: 'جڑ رہا ہے…', typeReply: 'جواب لکھیں', mute: 'خاموش', end: 'ختم',
  couldNotCall: 'کال شروع نہیں ہو سکی۔ انٹرنیٹ اور مائیک چیک کریں۔', locTitle: '«عون» کو مقام استعمال کرنے دیں؟',
  locBody: 'قریب ترین جگہ کے لیے ایک بار۔ کوآرڈینیٹس محفوظ نہیں ہوتے۔', allow: 'اجازت دیں', dontAllow: 'اجازت نہ دیں',
  assistantHint: 'سن رہی ہیں · کچھ بھی پوچھیں', assistantCall: '«{name}»', typeHere: 'اپنی درخواست لکھیں…',
  apptReminderTitle: 'آپ کی اپوائنٹمنٹ کل ہے', save: 'محفوظ کریں', steps: 'مراحل', you: 'آپ',
  urgent: 'ایمرجنسی جائیں', soonLbl: 'جلد ڈاکٹر سے بات کریں', emergency: '997 پر کال کریں',
};

const hi: Dict = {
  ...en,
  home: 'होम', notebook: 'मेरी नोटबुक', meds: 'मेरी दवाइयाँ', back: 'वापस', settings: 'सेटिंग्स', send: 'भेजें', cancel: 'रद्द करें', confirm: 'पुष्टि करें',
  loading: 'एक पल…', retry: 'फिर कोशिश करें', offline: 'औन से संपर्क नहीं हो पाया। इंटरनेट जाँचें।',
  hello: 'नमस्ते', confirmed: 'अपॉइंटमेंट पक्की', pending: 'पुष्टि बाकी', noBooking: 'अभी कोई अपॉइंटमेंट नहीं', viewPlan: 'विज़िट प्लान देखें',
  bookAppt: 'औन के साथ तय करें', pickTime: 'खुद समय चुनें', myCare: 'मेरी देखभाल', record: 'मेरा स्वास्थ्य रिकॉर्ड', recordSub: 'हर जगह की सभी रिपोर्ट',
  messages: 'डॉक्टर के संदेश', messagesSub: 'अपने डॉक्टर से पूछें', family: 'पारिवारिक स्वास्थ्य', carePlan: 'देखभाल योजना',
  planTitle: 'विज़िट प्लान', doctor: 'डॉक्टर', clinic: 'क्लिनिक', center: 'जगह', trip: 'पहुँचना', changeAppt: 'समय बदलें', cancelAppt: 'अपॉइंटमेंट रद्द करें',
  directions: 'गूगल मैप्स में रास्ता', uber: 'सेंटर के लिए उबर', darb: 'दर्ब: मेट्रो और बस', transit: 'मेट्रो से रास्ता',
  bookingTitle: 'उपलब्ध समय', femaleOnly: 'केवल महिला डॉक्टर', bookThis: 'यह समय बुक करें', booked: 'आपकी अपॉइंटमेंट बुक हो गई',
  nbTitle: 'मेरी स्वास्थ्य नोटबुक', tests: 'स्क्रीनिंग', results: 'मेरे नतीजे', fullRecord: 'पूरा रिकॉर्ड', doctorNotes: 'डॉक्टर के नोट्स', files: 'अटैचमेंट',
  normal: 'सामान्य', borderline: 'सीमा पर', high: 'अधिक', low: 'कम', recordTitle: 'मेरा स्वास्थ्य रिकॉर्ड', accessLog: 'मेरा रिकॉर्ड किसने खोला',
  medsTitle: 'दवाइयाँ और विटामिन', active: 'मौजूदा', past: 'पिछली', withFood: 'खाने के बाद', remindersOn: 'रिमाइंडर चालू हैं', enableReminders: 'रिमाइंडर चालू करें',
  medReminderTitle: '{name} का समय', messagesTitle: 'डॉक्टर के संदेश', typeMessage: 'संदेश लिखें…', familyHistory: 'पारिवारिक इतिहास',
  textSize: 'अक्षर का आकार', language: 'भाषा', voice: 'सहायक की आवाज़', privacy: 'आपकी गोपनीयता',
  incoming: 'औन से वॉइस कॉल', aoun: 'औन', screeningHelper: 'शुरुआती जाँच सहायक', accept: 'उठाएँ', decline: 'मना करें', yourTurn: 'आपकी बारी',
  connecting: 'जोड़ रहे हैं…', typeReply: 'जवाब लिखें', mute: 'म्यूट', end: 'समाप्त', allow: 'अनुमति दें', dontAllow: 'अनुमति न दें',
  locTitle: '“औन” को आपकी लोकेशन इस्तेमाल करने दें?', locBody: 'सबसे नज़दीकी जगह के लिए एक बार। आपके निर्देशांक सेव नहीं होते।',
  assistantHint: 'सुन रही हैं · कुछ भी पूछें', typeHere: 'अपना अनुरोध लिखें…', apptReminderTitle: 'आपकी अपॉइंटमेंट कल है',
};

const bn: Dict = {
  ...en,
  home: 'হোম', notebook: 'আমার নোটবুক', meds: 'আমার ওষুধ', back: 'ফিরে যান', settings: 'সেটিংস', send: 'পাঠান', cancel: 'বাতিল', confirm: 'নিশ্চিত করুন',
  loading: 'এক মুহূর্ত…', retry: 'আবার চেষ্টা করুন', offline: 'আউনের সাথে যোগাযোগ হয়নি। ইন্টারনেট দেখুন।',
  hello: 'আসসালামু আলাইকুম', confirmed: 'অ্যাপয়েন্টমেন্ট নিশ্চিত', pending: 'নিশ্চিতকরণের অপেক্ষায়', noBooking: 'এখনও কোনো অ্যাপয়েন্টমেন্ট নেই', viewPlan: 'ভিজিট পরিকল্পনা দেখুন',
  bookAppt: 'আউনের সাথে ঠিক করুন', pickTime: 'নিজে সময় বেছে নিন', myCare: 'আমার যত্ন', record: 'আমার স্বাস্থ্য রেকর্ড', recordSub: 'সব জায়গার সব রিপোর্ট',
  messages: 'ডাক্তারের বার্তা', messagesSub: 'আপনার ডাক্তারকে জিজ্ঞেস করুন', family: 'পারিবারিক স্বাস্থ্য', carePlan: 'যত্ন পরিকল্পনা',
  planTitle: 'ভিজিট পরিকল্পনা', doctor: 'ডাক্তার', clinic: 'ক্লিনিক', center: 'স্থান', trip: 'যাতায়াত', changeAppt: 'সময় বদলান', cancelAppt: 'অ্যাপয়েন্টমেন্ট বাতিল',
  directions: 'গুগল ম্যাপসে পথ', uber: 'সেন্টারে উবার', darb: 'দারব: মেট্রো ও বাস', transit: 'মেট্রোতে পথ',
  bookingTitle: 'খালি সময়', femaleOnly: 'শুধু মহিলা ডাক্তার', bookThis: 'এই সময় বুক করুন', booked: 'আপনার অ্যাপয়েন্টমেন্ট বুক হয়েছে',
  nbTitle: 'আমার স্বাস্থ্য নোটবুক', tests: 'স্ক্রিনিং', results: 'আমার ফলাফল', fullRecord: 'পূর্ণ রেকর্ড', doctorNotes: 'ডাক্তারের নোট', files: 'সংযুক্তি',
  normal: 'স্বাভাবিক', borderline: 'সীমানায়', high: 'বেশি', low: 'কম', recordTitle: 'আমার স্বাস্থ্য রেকর্ড', accessLog: 'কে আমার রেকর্ড খুলেছে',
  medsTitle: 'ওষুধ ও ভিটামিন', active: 'বর্তমান', past: 'আগের', withFood: 'খাবারের পরে', remindersOn: 'রিমাইন্ডার চালু', enableReminders: 'রিমাইন্ডার চালু করুন',
  medReminderTitle: '{name} খাওয়ার সময়', messagesTitle: 'ডাক্তারের বার্তা', typeMessage: 'বার্তা লিখুন…', familyHistory: 'পারিবারিক ইতিহাস',
  textSize: 'লেখার আকার', language: 'ভাষা', voice: 'সহকারীর কণ্ঠ', privacy: 'আপনার গোপনীয়তা',
  incoming: 'আউন থেকে ভয়েস কল', aoun: 'আউন', screeningHelper: 'প্রাথমিক পরীক্ষার সহকারী', accept: 'ধরুন', decline: 'কেটে দিন', yourTurn: 'আপনার পালা',
  connecting: 'সংযোগ হচ্ছে…', typeReply: 'উত্তর লিখুন', mute: 'মিউট', end: 'শেষ', allow: 'অনুমতি দিন', dontAllow: 'অনুমতি দেবেন না',
  locTitle: '“আউন”-কে আপনার অবস্থান ব্যবহার করতে দেবেন?', locBody: 'নিকটতম জায়গার জন্য একবার। আপনার স্থানাঙ্ক সংরক্ষণ হয় না।',
  assistantHint: 'শুনছে · যা খুশি জিজ্ঞেস করুন', typeHere: 'আপনার অনুরোধ লিখুন…', apptReminderTitle: 'আপনার অ্যাপয়েন্টমেন্ট আগামীকাল',
};

const fil: Dict = {
  ...en,
  home: 'Home', notebook: 'Notebook ko', meds: 'Mga gamot ko', back: 'Bumalik', settings: 'Settings', send: 'Ipadala', cancel: 'Kanselahin', confirm: 'Kumpirmahin',
  loading: 'Sandali lang…', retry: 'Subukan ulit', offline: 'Hindi maabot ang Aoun. Tingnan ang internet.',
  hello: 'Kumusta', confirmed: 'Kumpirmado ang appointment', pending: 'Hinihintay ang kumpirmasyon', noBooking: 'Wala pang appointment', viewPlan: 'Tingnan ang plano',
  bookAppt: 'Ayusin kasama ang Aoun', pickTime: 'Pumili ng oras', myCare: 'Pangangalaga ko', record: 'Health record ko', recordSub: 'Lahat ng report mo, mula kahit saan',
  messages: 'Mensahe ng doktor', messagesSub: 'Magtanong sa doktor', family: 'Kalusugan ng pamilya', carePlan: 'Plano ng pangangalaga',
  planTitle: 'Plano ng pagbisita', doctor: 'Doktor', clinic: 'Klinika', center: 'Lugar', trip: 'Pagpunta', changeAppt: 'Palitan ang oras', cancelAppt: 'Kanselahin ang appointment',
  directions: 'Direksyon sa Google Maps', uber: 'Mag-Uber papunta sa center', darb: 'Darb: metro at bus', transit: 'Ruta sa metro',
  bookingTitle: 'Mga bakanteng oras', femaleOnly: 'Babaeng doktor lang', bookThis: 'I-book ang oras na ito', booked: 'Naka-book na ang appointment mo',
  nbTitle: 'Health notebook ko', tests: 'Screening', results: 'Mga resulta ko', fullRecord: 'Buong record', doctorNotes: 'Tala ng doktor', files: 'Mga attachment',
  normal: 'Normal', borderline: 'Borderline', high: 'Mataas', low: 'Mababa', recordTitle: 'Health record ko', accessLog: 'Sino ang nagbukas ng record ko',
  medsTitle: 'Mga gamot at bitamina', active: 'Kasalukuyan', past: 'Nakaraan', withFood: 'pagkatapos kumain', remindersOn: 'Naka-on ang paalala', enableReminders: 'I-on ang paalala',
  medReminderTitle: 'Oras na para sa {name}', messagesTitle: 'Mensahe ng doktor', typeMessage: 'Sumulat ng mensahe…', familyHistory: 'Kasaysayan ng pamilya',
  textSize: 'Laki ng teksto', language: 'Wika', voice: 'Boses ng assistant', privacy: 'Privacy mo',
  incoming: 'Voice call mula sa Aoun', screeningHelper: 'Katulong sa maagang screening', accept: 'Sagutin', decline: 'Tanggihan', yourTurn: 'Ikaw na',
  connecting: 'Kumokonekta…', typeReply: 'Mag-type ng sagot', mute: 'I-mute', end: 'Tapusin', allow: 'Payagan', dontAllow: 'Huwag payagan',
  locTitle: 'Payagan ang “Aoun” na gamitin ang lokasyon mo?', locBody: 'Isang beses lang para sa pinakamalapit na lugar. Hindi sine-save ang coordinates mo.',
  assistantHint: 'nakikinig · magtanong ng kahit ano', typeHere: 'I-type ang kailangan mo…', apptReminderTitle: 'Bukas ang appointment mo',
};

const id: Dict = {
  ...en,
  home: 'Beranda', notebook: 'Catatan saya', meds: 'Obat saya', back: 'Kembali', settings: 'Pengaturan', send: 'Kirim', cancel: 'Batal', confirm: 'Konfirmasi',
  loading: 'Sebentar…', retry: 'Coba lagi', offline: 'Tidak bisa terhubung ke Aoun. Periksa internet.',
  hello: 'Halo', confirmed: 'Janji temu dikonfirmasi', pending: 'Menunggu konfirmasi', noBooking: 'Belum ada janji temu', viewPlan: 'Lihat rencana kunjungan',
  bookAppt: 'Atur bersama Aoun', pickTime: 'Pilih waktu sendiri', myCare: 'Perawatan saya', record: 'Rekam medis saya', recordSub: 'Semua laporan Anda dari mana saja',
  messages: 'Pesan dokter', messagesSub: 'Tanya dokter Anda', family: 'Kesehatan keluarga', carePlan: 'Rencana perawatan',
  planTitle: 'Rencana kunjungan', doctor: 'Dokter', clinic: 'Klinik', center: 'Tempat', trip: 'Perjalanan', changeAppt: 'Ubah waktu', cancelAppt: 'Batalkan janji temu',
  directions: 'Petunjuk arah di Google Maps', uber: 'Pesan Uber ke pusat', darb: 'Darb: metro dan bus', transit: 'Rute dengan metro',
  bookingTitle: 'Waktu tersedia', femaleOnly: 'Hanya dokter perempuan', bookThis: 'Pesan waktu ini', booked: 'Janji temu Anda sudah dipesan',
  nbTitle: 'Catatan kesehatan saya', tests: 'Skrining', results: 'Hasil saya', fullRecord: 'Rekam lengkap', doctorNotes: 'Catatan dokter', files: 'Lampiran',
  normal: 'Normal', borderline: 'Batas', high: 'Tinggi', low: 'Rendah', recordTitle: 'Rekam medis saya', accessLog: 'Siapa yang membuka rekam saya',
  medsTitle: 'Obat dan vitamin', active: 'Saat ini', past: 'Sebelumnya', withFood: 'setelah makan', remindersOn: 'Pengingat aktif', enableReminders: 'Aktifkan pengingat',
  medReminderTitle: 'Waktunya {name}', messagesTitle: 'Pesan dokter', typeMessage: 'Tulis pesan…', familyHistory: 'Riwayat keluarga',
  textSize: 'Ukuran teks', language: 'Bahasa', voice: 'Suara asisten', privacy: 'Privasi Anda',
  incoming: 'Panggilan suara dari Aoun', screeningHelper: 'Pembantu skrining dini', accept: 'Terima', decline: 'Tolak', yourTurn: 'Giliran Anda',
  connecting: 'Menghubungkan…', typeReply: 'Ketik balasan', mute: 'Bisukan', end: 'Akhiri', allow: 'Izinkan', dontAllow: 'Jangan izinkan',
  locTitle: 'Izinkan “Aoun” memakai lokasi Anda?', locBody: 'Sekali saja untuk mencari tempat terdekat. Koordinat Anda tidak disimpan.',
  assistantHint: 'mendengarkan · tanya apa saja', typeHere: 'Ketik permintaan Anda…', apptReminderTitle: 'Janji temu Anda besok',
};

const S: Record<Lang, Dict> = { ar, en, ur, hi, bn, fil, id };

export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s: string = (S[lang] ?? en)[key] ?? en[key];
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

export function langInfo(lang: Lang) {
  return LANGS.find((l) => l.key === lang) ?? LANGS[0];
}

/** Pick the Arabic or English text the server sent, by the app language. */
export function pick<T extends Record<string, unknown>>(obj: T | null | undefined, base: string, lang: Lang): string {
  if (!obj) return '';
  const v = obj[`${base}_${lang === 'ar' ? 'ar' : 'en'}`] ?? obj[`${base}_ar`];
  return typeof v === 'string' ? v : '';
}

export function useT() {
  const lang = useApp((s) => s.lang);
  const info = langInfo(lang);
  return {
    lang, rtl: info.rtl, locale: info.locale,
    t: (key: Key, vars?: Record<string, string | number>) => t(lang, key, vars),
    pick: <T extends Record<string, unknown>>(o: T | null | undefined, base: string) => pick(o, base, lang),
  };
}

/** Date and time in the app language, in Riyadh time. */
export function when(iso: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) {
  try { return new Date(iso).toLocaleString(locale, { timeZone: 'Asia/Riyadh', ...opts }); } catch { return iso.slice(0, 16).replace('T', ' '); }
}
