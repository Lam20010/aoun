// «خطة الرعاية»: from booking to result, built from the real plan, walks and results.
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Button, Card, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT, when } from '../src/i18n';
import { useApp } from '../src/store';
import { api } from '../src/api';
import { placeName } from '../src/data/plan';
import type { Records, Walks } from '../src/types';

export default function Care() {
  const { t, lang, locale, pick } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const plan = useApp((s) => s.plan);
  const [walks, setWalks] = useState<Walks | null>(null);
  const [rec, setRec] = useState<Records | null>(null);
  useFocusEffect(useCallback(() => { api.walks().then(setWalks).catch(() => {}); api.records().then(setRec).catch(() => {}); }, []));
  const slot = plan?.slot;
  const mine = rec?.records.filter((r) => r.source === 'aoun') ?? [];
  const items: { title: string; body: string; color: string; done: boolean }[] = [
    { title: T('زيارة المركز', 'Health center visit'), color: C.tealMid, done: !!plan?.confirmed,
      body: slot ? `${lang === 'ar' ? plan!.screening_ar : plan!.screening_en} · ${when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })} · ${placeName(slot, t, lang)}`
        : T('ما فيه موعد للحين. رفيدة ترتّبه لك.', 'No visit yet. Rufaida will arrange it.') },
    { title: T('دعم الزيارة', 'Help to get there'), color: C.blue, done: !!plan?.ride,
      body: plan?.ride ? (plan.ride.mode === 'metro' ? T('بالمترو من محطة الحي · تذكرة درب', 'Metro from the district station · Darb ticket') : T('سيارة توصلك وترجّعك', 'A car takes you and brings you back'))
        : T('تقدرين تطلبين توصيل من المكالمة أو من الخطة.', 'You can ask for a ride in the call or from the plan.') },
    { title: T('المشي من خطتك', 'Walking, part of your plan'), color: C.lime, done: (walks?.week_minutes ?? 0) >= (walks?.goal_minutes ?? 150),
      body: T(`نص ساعة مشي يوميًا في ممشى الحي. هالأسبوع: ${walks?.week_minutes ?? 0} من ${walks?.goal_minutes ?? 150} دقيقة.`, `Half an hour a day at the district walkway. This week: ${walks?.week_minutes ?? 0} of ${walks?.goal_minutes ?? 150} min.`) },
    { title: T('بعد النتيجة', 'After the result'), color: '#E2D36B', done: mine.length > 0,
      body: mine.length ? T(`طبيبك راجع ${mine.length} نتيجة. شوفيها في سجلك.`, `Your doctor reviewed ${mine.length} result(s). See them in your record.`)
        : T('رفيدة توصلك النتيجة بعد ما يراجعها الطبيب، وترتّب المتابعة إذا احتجتي.', 'Rufaida sends the result after the doctor reviews it, and arranges follow-up if needed.') },
  ];
  useReadable([T('خطة الرعاية', 'Care plan'), ...items.map((i) => i.title + '. ' + i.body)]);
  return (
    <Screen title={T('خطة الرعاية', 'Care plan')}>
      <LinearGradient colors={['#6C8CBF', '#3BA6E0']} style={{ borderRadius: 24, padding: 22, minHeight: 120, justifyContent: 'flex-end' }}>
        <Txt size={28} weight="800" color={C.white}>{T('خطة الرعاية', 'Care plan')}</Txt>
        {slot?.doctor && <Txt size={14} color="rgba(255,255,255,.9)">{pick(slot.doctor as never, 'name')} · {pick(slot.doctor as never, 'clinic')}</Txt>}
      </LinearGradient>
      <Card style={{ gap: 0 }}>
        {items.map((it, i) => (
          <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 16 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: it.done ? it.color : C.white, borderWidth: 2.5, borderColor: it.color, marginTop: 5 }} />
              {i < items.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 50, backgroundColor: C.line }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
              <Txt size={16} weight="800">{it.title}</Txt>
              <Txt size={13} color={C.inkSoft}>{it.body}</Txt>
            </View>
          </Row>
        ))}
      </Card>
      <Button title={T('عرض المتابعة', 'Open the visit plan')} tone="mint" onPress={() => router.push('/plan')} />
      <Button title={T('ممشى الحي', 'District walkway')} tone="ghost" onPress={() => router.push('/walk')} />
    </Screen>
  );
}
