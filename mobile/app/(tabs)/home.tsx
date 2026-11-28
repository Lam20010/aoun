// Home, as in the presentation: «هلا يا حصة» over the neighbourhood, the visit card with the week strip,
// a ride card, then «رعايتي»: care plan, family, the district walkway (with the scene), «حيّ عون»,
// «وقت الإبرة؟», the health record and the doctor's messages. News from the Ministry for the district
// (a new mobile clinic, evening hours, free rides, the "healthy district" challenge) shows at the top.
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Skyline } from '../../src/ui/Skyline';
import { Button, Card, Circle, Row, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { useT, when, type Key } from '../../src/i18n';
import { useApp } from '../../src/store';
import { api, refresh } from '../../src/api';
import { planRows } from '../../src/data/plan';
import { demoFirstName } from '../../src/data/profile';
import { freshDay, GAME0 } from '../../src/data/game';
import type { DistrictNews, Walks } from '../../src/types';

export default function Home() {
  const { t, rtl, lang, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const plan = useApp((s) => s.plan);
  const me = useApp((s) => s.me);
  const voice = useApp((s) => s.voice);
  const game = useApp((s) => s.game);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [news, setNews] = useState<DistrictNews | null>(null);
  const [walks, setWalks] = useState<Walks | null>(null);
  const load = useCallback(() => {
    setBusy(true);
    refresh().then(() => setOffline(false)).catch(() => setOffline(true)).finally(() => setBusy(false));
    api.district().then(setNews).catch(() => {});
    api.walks().then(setWalks).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const slot = plan?.slot ?? null;
  const rows = plan ? planRows(plan, t, pick, lang) : [];
  const day = slot ? new Date(new Date(slot.iso).getTime() + 3 * 3600000).getUTCDay() : -1;
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 29 + i)).toLocaleDateString(locale, { weekday: 'short' }));
  const seh = me?.sehhaty;
  const name = (lang === 'ar' ? seh?.first_name_ar : seh?.first_name_en) || demoFirstName(me?.gender ?? voice, lang);
  const pts = freshDay(game ?? GAME0(''), '').pts;
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const walkSub = walks ? T(`${walks.week_minutes} من ${walks.goal_minutes} دقيقة هالأسبوع`, `${walks.week_minutes} of ${walks.goal_minutes} min this week`) : t('walkSub');

  useReadable([
    t('hello') + ' ' + name,
    slot ? (plan!.confirmed ? t('confirmed') : t('pending')) + '، ' + when(slot.iso, locale) : t('noBooking'),
    ...rows.map((r) => r.text),
  ]);

  const tiles: { key: string; title: string; sub: string; icon: string; bg: string; to: string; wide?: boolean; scene?: boolean }[] = [
    { key: 'care', title: t('carePlan'), sub: t('carePlanSub'), icon: ICON.doc, bg: C.yellow, to: '/care' },
    { key: 'family', title: t('family'), sub: T('شجرة عائلتك', 'Your family tree'), icon: ICON.people, bg: C.mint, to: '/family' },
    { key: 'walk', title: t('walk'), sub: walkSub, icon: ICON.walk, bg: C.mintSoft, to: '/walk', wide: true, scene: true },
    { key: 'game', title: t('game'), sub: T(`${pts} عملة · ساعدي جيرانك`, `${pts} coins · help your neighbours`), icon: ICON.game, bg: '#E1E8F3', to: '/game' },
    { key: 'needle', title: t('needle'), sub: t('needleSub'), icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', bg: '#EEF2D2', to: '/game?mode=calm' },
    { key: 'record', title: t('record'), sub: t('recordSub'), icon: ICON.file, bg: C.lavender, to: '/record' },
    { key: 'messages', title: t('messages'), sub: t('messagesSub'), icon: ICON.chat, bg: C.mintCard, to: '/messages' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 210 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      {/* welcome over the neighbourhood */}
      <LinearGradient colors={['#D5EFE8', '#EAF5F1', C.bg]} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('settings')}>
            <Circle size={44}><Icon d={ICON.sliders} size={20} /></Circle>
          </Pressable>
          <Pressable onPress={() => router.push('/assistant')} accessibilityRole="button"><Circle size={44}><Icon d={ICON.heart} size={22} color={C.teal} /></Circle></Pressable>
        </Row>
        <Txt size={34} weight="800" color={C.teal} style={{ marginTop: 14 }}>{t('hello')} {name}</Txt>
        <Row gap={6}><View style={s.dot} /><Txt size={14} color={C.muted}>{me ? (lang === 'ar' ? 'حي ' + me.district_ar : me.district_en) + ' · ' + (lang === 'ar' ? 'الرياض' : 'Riyadh') : ''}</Txt></Row>
        <View style={{ marginHorizontal: -20, marginTop: 4 }}><Skyline width="100%" height={92} variant={1} /></View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 20 }}>
        {offline && <Card style={{ marginTop: 12, backgroundColor: C.yellow }}><Txt size={14}>{t('offline')}</Txt></Card>}

        {news?.interventions.slice(0, 2).map((iv) => (
          <Card key={iv.id} style={{ marginTop: 12, backgroundColor: '#E6F4F1', gap: 4 }} onPress={() => router.push(iv.kind === 'challenge' ? '/game' : '/booking')}>
            <Row gap={8}><Icon d={ICON.shield} size={18} color={C.teal} /><Txt size={13} weight="700" color={C.teal}>{T('جديد من وزارة الصحة لحيّك', 'New from the Ministry for your district')}</Txt></Row>
            <Txt size={16} weight="800">{pick(iv as never, 'title')}</Txt>
            <Txt size={13} color={C.inkSoft}>{pick(iv as never, 'detail')}</Txt>
            {iv.kind === 'challenge' && iv.goal ? (
              <View style={{ height: 8, borderRadius: 4, backgroundColor: C.white, overflow: 'hidden', marginTop: 4 }}><View style={{ height: '100%', width: `${(iv.progress ?? 0) / iv.goal * 100}%`, backgroundColor: C.tealMid }} /></View>
            ) : null}
          </Card>
        ))}

        <LinearGradient colors={GRAD.apptCard} style={s.appt}>
          {slot ? (
            <>
              <Row gap={6}>
                {plan!.confirmed && <Icon d={ICON.check} size={14} color={C.teal} width={2.4} />}
                <Txt size={14} weight="700" color={C.teal}>{plan!.confirmed ? t('confirmed') : T('موعد مقترح · أكّديه من المكالمة', 'Suggested · confirm it in the call')}</Txt>
              </Row>
              <Txt size={26} weight="800">{when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</Txt>
              <View style={{ gap: 6, marginTop: 6 }}>
                {rows.map((r, i) => (
                  <Row key={i} gap={8}><Icon d={r.icon} size={17} color={C.inkSoft} /><Txt size={15} color={r.accent ? C.teal : C.ink} weight={r.accent ? '700' : '400'} style={{ flex: 1 }}>{r.text}</Txt></Row>
                ))}
              </View>
              <Row style={s.week} gap={0}>
                {days.map((d, i) => {
                  const on = i === day;
                  return (
                    <View key={i} style={[s.day, on && { backgroundColor: C.dark }]}>
                      <Txt size={11} weight="700" color={on ? C.white : C.inkSoft} center lines={1}>{d}</Txt>
                      <View style={[s.dayDot, { backgroundColor: on ? C.mint : '#C9DAD6' }]} />
                    </View>
                  );
                })}
              </Row>
              <View style={s.dash} />
              <Pressable onPress={() => router.push('/plan')} accessibilityRole="button">
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt size={16} weight="700">{t('viewPlan')}</Txt>
                  <Icon d={rtl ? ICON.arrowLeft : 'M5 12h14M13 6l6 6-6 6'} />
                </Row>
              </Pressable>
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <Txt size={22} weight="800">{t('noBooking')}</Txt>
              <Txt size={14} color={C.inkSoft}>{plan ? (lang === 'ar' ? plan.screening_ar : plan.screening_en) : ''}</Txt>
              <Button title={t('bookAppt')} onPress={() => router.push('/incoming')} icon={<Icon d={ICON.phone} color={C.white} size={16} />} />
              <Button title={t('pickTime')} tone="ghost" onPress={() => router.push('/booking')} icon={<Icon d={ICON.calendar} size={16} />} />
            </View>
          )}
        </LinearGradient>

        {slot && slot.kind !== 'home_visit' && (
          <Card style={{ marginTop: 14 }} onPress={() => router.push('/map')}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8}><Icon d={ICON.car} color={C.teal} /><Txt size={16} weight="700">{plan?.ride ? T('متابعة طلب التوصيل', 'Track your ride') : T('إضافة طلب توصيل', 'Add a ride')}</Txt></Row>
              <Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} color={C.muted} size={16} />
            </Row>
          </Card>
        )}

        <Txt size={24} weight="800" style={{ marginTop: 26, marginBottom: 12 }}>{t('myCare')}</Txt>
        <View style={[s.grid, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {tiles.map((tile) => (
            <Pressable key={tile.key} onPress={() => router.push(tile.to as never)} style={[s.tile, { backgroundColor: tile.bg, width: tile.wide ? '100%' : '48.3%', overflow: 'hidden' }]} accessibilityRole="button">
              {tile.scene && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none"><Skyline width="100%" height={70} opacity={0.75} /></View>}
              <Row style={{ justifyContent: 'space-between' }}>
                <Circle size={40}><Icon d={tile.icon} size={19} /></Circle>
                <Icon d={ICON.diag} size={16} color={C.inkSoft} />
              </Row>
              <View style={{ marginTop: tile.wide ? 18 : 18 }}>
                <Txt size={18} weight="800">{tile.title}</Txt>
                <Txt size={13} color={C.inkSoft}>{tile.sub}</Txt>
              </View>
              {tile.scene && <View style={{ height: 34 }} />}
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.tealMid },
  appt: { borderRadius: R.card, padding: 18, marginTop: 12, gap: 2 },
  week: { backgroundColor: C.white, borderRadius: 26, padding: 5, marginTop: 14, justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 22, gap: 3 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,63,66,.25)', marginVertical: 14 },
  grid: { flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  tile: { borderRadius: 24, padding: 14, minHeight: 120 },
});
