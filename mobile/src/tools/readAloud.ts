// What the assistant can read to the person, straight from their own data. The phone builds the lines
// and speaks them with its own voice: the agent asks for a topic and never receives the contents.
import { api } from '../api';
import { t as tr, type Key, type Lang } from '../i18n';
import { useApp } from '../store';

export const READ_TOPICS = ['screen', 'plan', 'results', 'diagnoses', 'messages', 'medicines', 'record', 'everything'] as const;
export type Topic = typeof READ_TOPICS[number];

const W = (lang: Lang, ar: string, en: string) => (lang === 'ar' ? ar : en);
const pk = (o: Record<string, unknown> | null | undefined, k: string, lang: Lang) => String((o?.[`${k}_${lang === 'ar' ? 'ar' : 'en'}`] ?? o?.[`${k}_ar`]) ?? '');
const flagText = (flag: string | null, lang: Lang) => tr(lang, (flag ?? 'normal') as Key);
const day = (iso: string, lang: Lang) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' });

export async function linesFor(topic: Topic, lang: Lang): Promise<string[]> {
  const st = useApp.getState();
  if (topic === 'screen') return st.screenText;
  if (topic === 'everything') {
    const parts = await Promise.all((['plan', 'diagnoses', 'medicines', 'messages'] as Topic[]).map((t) => linesFor(t, lang).catch(() => [])));
    return parts.flat();
  }
  if (topic === 'plan') {
    const p = st.plan;
    if (!p?.slot) return [W(lang, 'ما عندك موعد للحين.', 'You have no appointment yet.')];
    const s = p.slot;
    return [
      W(lang, 'موعدك', 'Your appointment') + ': ' + (lang === 'ar' ? p.screening_ar : p.screening_en),
      new Date(s.iso).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }),
      (lang === 'ar' ? s.center_ar : s.center_en ?? s.center_ar) + (s.doctor ? '، ' + pk(s.doctor as never, 'name', lang) : ''),
      s.cost ? (s.cost.free ? W(lang, 'مجاني عبر صحتي', 'Free through Sehhaty') : (lang === 'ar' ? s.cost.note_ar : s.cost.note_en)) : '',
    ].filter(Boolean);
  }
  if (topic === 'results' || topic === 'diagnoses' || topic === 'record') {
    const r = await api.records();
    const list = topic === 'record' ? r.records : r.records.filter((x) => x.source === 'aoun' || x.kind === 'diagnosis' || x.flag);
    const out = list.slice(0, 12).map((x) => [pk(x as never, 'title', lang), x.value ? x.value + ' ' + (x.unit ?? '') : '', x.flag ? flagText(x.flag, lang) : '',
      pk(x as never, 'summary', lang), day(x.taken_at, lang)].filter(Boolean).join('، '));
    const notes = r.notes.map((n) => W(lang, 'ملاحظة ', 'Note from ') + pk(n.doctor as never, 'name', lang) + ': ' + n.body);
    const refs = r.referrals.map((x) => W(lang, 'إحالة: ', 'Referral: ') + x.kind + '، ' + x.doctor);
    const all = [...out, ...notes, ...refs];
    return all.length ? all : [W(lang, 'ما فيه نتائج أو تشخيصات مسجّلة للحين.', 'No results or diagnoses on record yet.')];
  }
  if (topic === 'messages') {
    const m = await api.messages();
    const name = (id: string) => pk(m.doctors.find((d) => d.id === id) as never, 'name', lang);
    const doc = m.messages.filter((x) => x.sender === 'doctor').slice(-6);
    return doc.length ? doc.map((x) => name(x.doctor_id) + ' ' + W(lang, 'يقول', 'says') + ': ' + (x.translated ?? x.body))
      : [W(lang, 'ما فيه رسائل من الطبيب.', 'No messages from your doctor.')];
  }
  if (topic === 'medicines') {
    const r = await api.meds();
    const act = r.meds.filter((x) => x.active);
    return act.length ? act.map((x) => [pk(x as never, 'name', lang), x.dose, x.times.join(W(lang, ' و ', ' and ')), x.with_food ? W(lang, 'مع الأكل', 'with food') : '',
      pk(x as never, 'instructions', lang)].filter(Boolean).join('، '))
      : [W(lang, 'ما عندك أدوية مسجّلة.', 'You have no medicines on record.')];
  }
  return [];
}
