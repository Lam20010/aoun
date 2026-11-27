import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Card, Circle, Row, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { useT, type Key } from '../../src/i18n';
import { useApp } from '../../src/store';
import { planRows, WHEN } from '../../src/data/plan';
import { DEMO_FIRST_NAME } from '../../src/data/profile';

const DAYS = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

export default function Home() {
  const { t, rtl } = useT();
  const insets = useSafeAreaInsets();
  const plan = useApp((s) => s.plan);
  const rows = planRows(plan);
  const when = WHEN[plan.when];

  useReadable([
    t('hello') + ' ' + DEMO_FIRST_NAME,
    (plan.confirmed ? t('confirmed') : t('pending')) + '، ' + when.label,
    ...rows.map((r) => r.text),
  ]);

  const tiles: { key: Key; sub: Key; icon: string; bg: string; to: string; wide?: boolean }[] = [
    { key: 'carePlan', sub: 'carePlanSub', icon: ICON.doc, bg: C.yellow, to: '/plan' },
    { key: 'family', sub: 'familySub', icon: ICON.people, bg: C.mintCard, to: '/family' },
    { key: 'walk', sub: 'walkSub', icon: ICON.walk, bg: '#DDEFE8', to: '/map?focus=walk', wide: true },
    { key: 'game', sub: 'gameSub', icon: ICON.game, bg: C.lavender, to: '/soon?k=game' },
    { key: 'needle', sub: 'needleSub', icon: ICON.spark, bg: '#EEF2D2', to: '/soon?k=needle' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 200 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Image source={require('../../assets/aoun-icon.png')} style={{ width: 40, height: 40 }} />
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('settings')}>
          <Circle size={44}><Icon d={ICON.sliders} size={20} /></Circle>
        </Pressable>
      </Row>

      <Txt size={32} weight="800" color={C.teal} style={{ marginTop: 18 }}>{t('hello')} {DEMO_FIRST_NAME}</Txt>
      <Row gap={6}><View style={s.dot} /><Txt size={14} color={C.muted}>{t('district')}</Txt></Row>

      <LinearGradient colors={GRAD.apptCard} style={s.appt}>
        <Row gap={6}>
          {plan.confirmed && <Icon d={ICON.check} size={14} color={C.teal} width={2.4} />}
          <Txt size={14} weight="700" color={C.teal}>{plan.confirmed ? t('confirmed') : t('pending')}</Txt>
        </Row>
        <Txt size={28} weight="800">{when.label}</Txt>
        <View style={{ gap: 6, marginTop: 4 }}>
          {rows.map((r, i) => (
            <Row key={i} gap={8}><Icon d={r.icon} size={17} color={C.inkSoft} /><Txt size={15} color={r.accent ? C.teal : C.ink} weight={r.accent ? '700' : '400'}>{r.text}</Txt></Row>
          ))}
        </View>
        <Row style={s.week} gap={0}>
          {DAYS.map((d, i) => {
            const on = i === when.day;
            return (
              <View key={d} style={[s.day, on && { backgroundColor: C.dark }]}>
                <Txt size={12} weight="700" color={on ? C.white : C.inkSoft} center>{d}</Txt>
                <View style={[s.dayDot, { backgroundColor: on ? C.white : '#C9DAD6' }]} />
              </View>
            );
          })}
        </Row>
        <View style={s.dash} />
        <Pressable onPress={() => router.push(plan.confirmed ? '/plan' : '/incoming')} accessibilityRole="button">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={16} weight="700">{plan.confirmed ? t('viewPlan') : t('bookAppt')}</Txt>
            <Icon d={rtl ? ICON.arrowLeft : 'M5 12h14M13 6l6 6-6 6'} />
          </Row>
        </Pressable>
      </LinearGradient>

      {!!plan.ride && plan.place !== 'home' && (
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
            <View style={{ marginTop: tile.wide ? 22 : 18 }}>
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
  appt: { borderRadius: R.card, padding: 18, marginTop: 18, gap: 4 },
  week: { backgroundColor: C.white, borderRadius: 26, padding: 5, marginTop: 14, justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 22, gap: 3 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,63,66,.25)', marginVertical: 14 },
  grid: { flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  tile: { borderRadius: 24, padding: 14, minHeight: 130 },
});
