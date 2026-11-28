// «توعية»: short, plain awareness cards. The person's own screening comes first. General guidance only;
// the doctor decides what is right for each person.
import type { Lang } from '../i18n';

export interface Tip { key: string; screening?: string; c: string; ink: string; icon: string; tag: [string, string]; title: [string, string]; facts: [string, string][] }

export const TIPS: Tip[] = [
  { key: 'diabetes', screening: 'diabetes', c: '#E6F4F1', ink: '#2F7F80', icon: 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z',
    tag: ['نوفمبر شهر التوعية بالسكري', 'November is diabetes awareness month'], title: ['السكري يقدر ينكشف بدري', 'Diabetes can be caught early'],
    facts: [['كثير ما يحسّون بأي أعراض في البداية.', 'Many people feel nothing at first.'],
      ['فحص السكر التراكمي من عمر ٣٥، أو قبل لو في العائلة سكري.', 'An HbA1c test from 35, or earlier if diabetes runs in the family.'],
      ['نص ساعة مشي يوميًا ووزن صحي يقللون الخطر.', 'Half an hour of walking a day and a healthy weight lower the risk.']] },
  { key: 'breast', screening: 'breast', c: '#FCE8EE', ink: '#A33A5C', icon: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z',
    tag: ['صحة المرأة', 'Women\'s health'], title: ['أشعة الثدي من عمر ٤٠', 'Mammogram from 40'],
    facts: [['الاكتشاف المبكر يرفع فرص الشفاء بشكل كبير.', 'Finding it early greatly improves the chance of cure.'],
      ['أشعة الماموجرام كل سنتين للسيدات من ٤٠ سنة، مجانًا عبر صحتي.', 'A mammogram every two years for women 40+, free through Sehhaty.'],
      ['أي تغيّر أو كتلة؟ راجعي طبيبتك بدون انتظار.', 'Any change or lump? See your doctor without waiting.']] },
  { key: 'bp', screening: 'hypertension', c: '#FBF5D6', ink: '#6B5A08', icon: 'M3 12h4l2-5 4 10 2-5h6',
    tag: ['القاتل الصامت', 'The silent killer'], title: ['قيسي ضغطك مرة بالسنة', 'Check your blood pressure yearly'],
    facts: [['ارتفاع الضغط غالبًا بدون أعراض.', 'High blood pressure usually has no symptoms.'],
      ['قلّلي الملح، وامشي، ونامي زين.', 'Less salt, more walking, good sleep.'],
      ['القياس مجاني في المركز الصحي وبعض الصيدليات.', 'Free checks at the health center and some pharmacies.']] },
  { key: 'colon', screening: 'colorectal', c: '#E1E8F3', ink: '#3D5F94', icon: 'M8 4c-3 0-4 3-2 5s6 1 6 5-4 4-4 6M16 4c3 0 4 3 2 5',
    tag: ['من عمر ٤٥', 'From age 45'], title: ['فحص القولون بسيط', 'Colon screening is simple'],
    facts: [['تحليل براز منزلي بسيط يكشفه بدري.', 'A simple home stool test finds it early.'],
      ['من عمر ٤٥ إلى ٧٥، أو قبل لو في العائلة.', 'From 45 to 75, or earlier if it runs in the family.'],
      ['تغيّر في الإخراج أو دم؟ راجعي الطبيب.', 'Change in bowel habits or blood? See a doctor.']] },
  { key: 'flu', c: '#EEF2D2', ink: '#4B5512', icon: 'M12 3v18M5 8l14 8M19 8L5 16',
    tag: ['موسم الشتاء', 'Winter season'], title: ['لقاح الإنفلونزا متاح الحين', 'The flu vaccine is available now'],
    facts: [['مهم لكبار السن والحوامل وأصحاب الأمراض المزمنة.', 'Important for older people, pregnancy and chronic conditions.'],
      ['مجاني في المراكز الصحية، احجزي من صحتي.', 'Free at health centers; book in Sehhaty.'],
      ['يحتاج جرعة كل سنة.', 'You need one dose every year.']] },
  { key: 'chol', screening: 'cholesterol', c: '#F4E9F7', ink: '#7A3E8F', icon: 'M12 21l-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6z',
    tag: ['صحة القلب', 'Heart health'], title: ['الكوليسترول ما يبان إلا بتحليل', 'Cholesterol only shows in a blood test'],
    facts: [['تحليل دم بسيط كل ٥ سنوات من عمر ٤٠.', 'A simple blood test every 5 years from 40.'],
      ['الأكل المقلي والدهون المشبعة ترفعه.', 'Fried food and saturated fat raise it.'],
      ['المشي والخضار والسمك تساعد.', 'Walking, vegetables and fish help.']] },
];

export function tipsFor(screening: string | undefined): Tip[] {
  const mine = TIPS.filter((x) => x.screening === screening);
  return [...mine, ...TIPS.filter((x) => x.screening !== screening)];
}
export const L = (pair: [string, string], lang: Lang) => (lang === 'ar' ? pair[0] : pair[1]);
