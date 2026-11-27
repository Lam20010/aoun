import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Button, Card, Circle, Row, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { useT, when, type Key } from '../../src/i18n';
import { useApp } from '../../src/store';
import { refresh } from '../../src/api';
import { planRows } from '../../src/data/plan';
import { demoFirstName } from '../../src/data/profile';

export default function Home() {
  const { t, rtl, lang, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const plan = useApp((s) => s.plan);
  const me = useApp((s) => s.me);
  const voice = useApp((s) => s.voice);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const load = useCallback(() => { setBusy(true); refresh().then(() => setOffline(false)).catch(() => setOffline(true)).finally(() => setBusy(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const slot = plan?.slot ?? null;
  const rows = plan ? planRows(plan, t, pick, lang) : [];
  const day = slot ? (new Date(slot.iso).getUTCDay() + (new Date(slot.iso).getUTCHours() + 3 >= 24 ? 1 : 0)) % 7 : -1;
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 29 + i)).toLocaleDateString(locale, { weekday: 'short' }));
  const name = demoFirstName(me?.gender ?? voice, lang);

  useReadable([
    t('hello') + ' ' + name,
    slot ? (plan!.confirmed ? t('confirmed') : t('pending')) + '، ' + when(slot.iso, locale) : t('noBooking'),
    ...rows.map((r) => r.text),
  ]);

  const tiles: { key: Key; sub: Key; icon: string; bg: string; to: string; wide?: boolean }[] = [
    { key: 'record', sub: 'recordSub', icon: ICON.file, bg: C.lavender, to: '/record', wide: true },
    { key: 'carePlan', sub: 'carePlanSub', icon: ICON.doc, bg: C.yellow, to: '/plan' },
    { key: 'messages', sub: 'messagesSub', icon: ICON.chat, bg: C.mintCard, to: '/messages' },
    { key: 'family', sub: 'familySub', icon: ICON.people, bg: '#DDEFE8', to: '/family' },
    { key: 'walk', sub: 'walkSub', icon: ICON.walk, bg: '#EEF2D2', to: '/map?focus=walk' },
    { key: 'game', sub: 'gameSub', icon: ICON.game, bg: C.lavender, to: '/soon?k=game' },
    { key: 'needle', sub: 'needleSub', icon: ICON.spark, bg: C.yellow, to: '/soon?k=needle' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 210 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Image source={require('../../assets/aoun-icon.png')} style={{ width: 40, height: 40 }} />
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('settings')}>
          <Circle size={44}><Icon d={ICON.sliders} size={20} /></Circle>
        </Pressable>
      </Row>

      <Txt size={32} weight="800" color={C.teal} style={{ marginTop: 18 }}>{t('hello')} {name}</Txt>
      <Row gap={6}><View style={s.dot} /><Txt size={14} color={C.muted}>{me ? (lang === 'ar' ? 'حي ' + me.district_ar : me.district_en) + ' · ' + (lang === 'ar' ? 'الرياض' : 'Riyadh') : ''}</Txt></Row>
      {offline && <Card style={{ marginTop: 12, backgroundColor: C.yellow }}><Txt size={14}>{t('offline')}</Txt></Card>}

      <LinearGradient colors={GRAD.apptCard} style={s.appt}>
        {slot ? (
          <>
            <Row gap={6}>
              {plan!.confirmed && <Icon d={ICON.check} size={14} color={C.teal} width={2.4} />}
              <Txt size={14} weight="700" color={C.teal}>{plan!.confirmed ? t('confirmed') : t('pending')}</Txt>
            </Row>
            <Txt size={26} weight="800">{when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</Txt>
            <Txt size={14} color={C.inkSoft}>{when(slot.iso, locale, { day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
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
                    <View style={[s.dayDot, { backgroundColor: on ? C.white : '#C9DAD6' }]} />
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
            <Row gap={8}><Icon d={ICON.car} color={C.teal} /><Txt size={16} weight="700">{t('rideTrack')}</Txt></Row>
            <Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} color={C.muted} size={16} />
          </Row>
        </Card>
      )}

      <Txt size={22} weight="800" style={{ marginTop: 26, marginBottom: 12 }}>{t('myCare')}</Txt>
      <View style={[s.grid, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {tiles.map((tile) => (
          <Pressable key={tile.key} onPress={() => router.push(tile.to as never)} style={[s.tile, { backgroundColor: tile.bg, width: tile.wide ? '100%' : '48.3%' }]} accessibilityRole="button">
            <Row style={{ justifyContent: 'space-between' }}>
              <Circle size={40}><Icon d={tile.icon} size={19} /></Circle>
              <Icon d={ICON.diag} size={16} color={C.inkSoft} />
            </Row>
            <View style={{ marginTop: tile.wide ? 14 : 18 }}>
              <Txt size={17} weight="800">{t(tile.key)}</Txt>
              <Txt size={13} color={C.inkSoft}>{t(tile.sub)}</Txt>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.tealMid },
  appt: { borderRadius: R.card, padding: 18, marginTop: 18, gap: 2 },
  week: { backgroundColor: C.white, borderRadius: 26, padding: 5, marginTop: 14, justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 22, gap: 3 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,63,66,.25)', marginVertical: 14 },
  grid: { flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  tile: { borderRadius: 24, padding: 14, minHeight: 120 },
});
