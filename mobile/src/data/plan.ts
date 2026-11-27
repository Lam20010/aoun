// Turns the plan into the rows shown on the home card, the call and the notebook.
import type { Plan } from '../store';
import { ICON } from '../ui/Icon';

export const WHEN: Record<Plan['when'], { label: string; day: number }> = {
  thu: { label: 'الخميس 4:30 العصر', day: 4 },
  thu5: { label: 'الخميس 5:00 العصر', day: 4 },
  sun: { label: 'الأحد 8:30 الصبح', day: 0 },
  wed: { label: 'الأربعاء 7:00 المسا', day: 3 },
  sat: { label: 'السبت 10:00 الصبح', day: 6 },
};
export const PLACE = { center: 'مركز صحي النسيم', mobile: 'العيادة المتنقلة عند جامع الحي', home: 'في بيتك، الفريق يجيك' };

export function rideLabel(p: Plan): string {
  const at = p.rideAt === '330' ? '3:30' : '4:00';
  return { '': '', car: 'طلب التوصيل · تمرّك ' + at, fam: 'سيارة عائلية · تمرّك ' + at, wheel: 'سيارة مجهّزة للكرسي · تمرّك ' + at, metro: 'المترو من محطة الحي · تذكرة درب' }[p.ride];
}

export interface Row { icon: string; text: string; accent?: boolean }

export function planRows(p: Plan): Row[] {
  const rows: Row[] = [
    { icon: ICON.doc, text: 'فحص السكر التراكمي' },
    { icon: ICON.pin, text: PLACE[p.place] },
  ];
  if (p.ride && p.place !== 'home') rows.push({ icon: ICON.car, text: rideLabel(p), accent: true });
  if (p.companion) rows.push({ icon: ICON.people, text: 'مرافق من العائلة يوصله التذكير' });
  if (p.prefs.length) rows.push({ icon: ICON.check, text: 'تفضيلاتك: ' + p.prefs.join('، ') });
  return rows;
}

export const TESTS = (p: Plan) => [
  { name: 'السكر التراكمي', status: p.confirmed ? 'موعد مؤكد' : 'مستحق', icon: ICON.drop, tone: 'mint' as const, highlight: true },
  { name: 'ضغط الدم', status: 'تم', icon: ICON.heart, tone: 'lime' as const },
  { name: 'الكوليسترول', status: 'مستحق', icon: ICON.chart, tone: 'soft' as const },
  { name: 'هشاشة العظام', status: 'مستحق', icon: ICON.clock, tone: 'soft' as const },
  { name: 'فحص النظر', status: 'موصى به', icon: ICON.plus, tone: 'soft' as const },
];

export const STEPS = (p: Plan) => [
  ['تم الحجز', 'من مكالمة عون'],
  ['التذكير', 'قبلها بيوم' + (p.companion ? ' · وللمرافق' : '')],
  [p.place === 'home' ? 'الفريق في الطريق' : 'المشوار', p.place === 'home' ? 'يوصلك البيت' : p.ride === 'metro' ? 'المسار بالمترو جاهز' : p.ride ? 'السيارة تمرّك قبل بنص ساعة' : 'المسار على الخريطة'],
  ['الفحص', WHEN[p.when].label],
  ['الطبيب يراجع النتيجة', 'خلال يومين'],
  ['النتيجة والخطة الجاية', 'لك أنتِ بس'],
];
