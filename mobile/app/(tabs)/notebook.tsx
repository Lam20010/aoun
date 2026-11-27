import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Card, Circle, Row, Segments, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store';
import { TESTS } from '../../src/data/plan';
import { DEMO_FIRST_NAME } from '../../src/data/profile';

type Seg = 'tests' | 'results' | 'prefs';
const TONE = { mint: { bg: C.mint, ink: C.dark }, lime: { bg: C.lime, ink: C.dark }, soft: { bg: C.mintSoft, ink: C.ink } };

export default function Notebook() {
  const { t, rtl } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ seg?: Seg }>();
  const [seg, setSeg] = useState<Seg>('tests');
  useEffect(() => { if (params.seg) setSeg(params.seg); }, [params.seg]);
  const plan = useApp((s) => s.plan);
  const tests = TESTS(plan);
  const done = tests.filter((x) => x.status === 'تم').length;

  useReadable(seg === 'tests' ? tests.map((x) => x.name + '، ' + x.status)
    : seg === 'prefs' ? (plan.prefs.length ? plan.prefs : ['ما فيه تفضيلات مسجّلة'])
    : [t('resultsEmpty')]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 200, gap: 12 }}>
      <LinearGradient colors={GRAD.notebookHead} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.head}>
        <Txt size={14} color="rgba(255,255,255,.9)">{DEMO_FIRST_NAME} بنت عبدالله</Txt>
        <Txt size={28} weight="800" color={C.white}>{t('nbTitle')}</Txt>
        <Row gap={5} style={{ marginTop: 6 }}>
          {tests.map((_, i) => <View key={i} style={[s.bar, { backgroundColor: i < done ? C.white : 'rgba(255,255,255,.35)' }]} />)}
        </Row>
        <Txt size={13} color="rgba(255,255,255,.9)">{t('nbDone')} {done}/{tests.length}</Txt>
      </LinearGradient>

      <Segments<Seg> value={seg} onChange={setSeg} items={[{ key: 'tests', label: t('tests') }, { key: 'results', label: t('results') }, { key: 'prefs', label: t('prefs') }]} />

      {seg === 'tests' && tests.map((x) => (
        <Card key={x.name} style={[s.row, x.highlight && { backgroundColor: C.lavender }]} onPress={x.highlight ? () => router.push('/plan') : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={12}>
              <Circle size={38} bg={TONE[x.tone].bg} style={{ borderRadius: 12 }}><Icon d={x.icon} size={18} color={TONE[x.tone].ink} /></Circle>
              <View><Txt size={17} weight="700">{x.name}</Txt><Txt size={12} color={C.muted}>{x.status}</Txt></View>
            </Row>
            <Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} color={C.muted} size={16} />
          </Row>
        </Card>
      ))}

      {seg === 'results' && (
        <Card><Row gap={10}><Icon d={ICON.shield} color={C.teal} /><Txt size={15} style={{ flex: 1 }}>{t('resultsEmpty')}</Txt></Row></Card>
      )}

      {seg === 'prefs' && (
        <Card style={{ gap: 10 }}>
          {(plan.prefs.length ? plan.prefs : ['—']).map((p) => <Row key={p} gap={8}><Icon d={ICON.check} color={C.teal} size={16} /><Txt size={15}>{p}</Txt></Row>)}
          {plan.companion && <Row gap={8}><Icon d={ICON.people} color={C.teal} size={16} /><Txt size={15}>{t('companion')} · {t('companionNote')}</Txt></Row>}
        </Card>
      )}

      <Txt size={22} weight="800" style={{ marginTop: 12 }}>{t('fromDistrict')}</Txt>
      <Row gap={12}>
        {[{ k: 'tips' as const, icon: ICON.bulb, bg: C.mintSoft, to: '/soon?k=tips' }, { k: 'game' as const, icon: ICON.home, bg: C.lavender, to: '/soon?k=game' }].map((x) => (
          <Pressable key={x.k} onPress={() => router.push(x.to as never)} style={[s.tile, { backgroundColor: x.bg }]} accessibilityRole="button">
            <Row style={{ justifyContent: 'space-between' }}><Circle size={38}><Icon d={x.icon} size={18} /></Circle><Icon d={ICON.diag} size={16} color={C.inkSoft} /></Row>
            <Txt size={17} weight="800" style={{ marginTop: 18 }}>{t(x.k)}</Txt>
          </Pressable>
        ))}
      </Row>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { borderRadius: R.card, padding: 18, gap: 4 },
  bar: { width: 20, height: 4, borderRadius: 2 },
  row: { paddingVertical: 14 },
  tile: { flex: 1, borderRadius: 24, padding: 14, minHeight: 110 },
});
