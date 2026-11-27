import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Button, Card, Circle, Pill, Row, Segments, Txt, flagTone } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { useT, when, type Key } from '../../src/i18n';
import { useApp } from '../../src/store';
import { api } from '../../src/api';
import type { Records } from '../../src/types';

type Seg = 'tests' | 'results' | 'prefs';

export default function Notebook() {
  const { t, rtl, lang, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ seg?: Seg }>();
  const [seg, setSeg] = useState<Seg>('tests');
  useEffect(() => { if (params.seg) setSeg(params.seg); }, [params.seg]);
  const me = useApp((s) => s.me);
  const plan = useApp((s) => s.plan);
  const [rec, setRec] = useState<Records | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setBusy(true); api.records().then(setRec).catch(() => {}).finally(() => setBusy(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tests = (me?.recommended ?? []).map((x) => {
    const last = rec?.records.filter((r) => r.screening === x.key).sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];
    const booked = plan?.slot && plan.screening === x.key;
    return { ...x, name: lang === 'ar' ? x.ar : x.en, last, booked: !!booked };
  });
  const done = tests.filter((x) => x.last).length;
  const mine = (rec?.records ?? []).filter((r) => r.source === 'aoun');
  const notes = rec?.notes ?? [];
  const prefs = (plan?.prefs ?? []).map((p) => t(({ female_doctor: 'femaleStaff', wheelchair_center: 'wheelchair', companion_reminders: 'companionOn', home_test: 'homeVisit' } as Record<string, Key>)[p] ?? 'prefs'));

  useReadable(seg === 'tests' ? tests.map((x) => x.name + '، ' + (x.booked ? t('confirmed') : x.last ? t('done') : t('due')))
    : seg === 'prefs' ? (prefs.length ? prefs : [t('noPrefs')])
    : mine.length ? mine.map((r) => pick(r as never, 'title') + '، ' + (r.value ?? '') + ' ' + (r.unit ?? '') + '، ' + t((r.flag ?? 'normal') as Key)).concat(notes.map((n) => n.body))
    : [t('noResults')]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 200, gap: 12 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      <LinearGradient colors={GRAD.notebookHead} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.head}>
        <Txt size={28} weight="800" color={C.white}>{t('nbTitle')}</Txt>
        <Row gap={5} style={{ marginTop: 6 }}>
          {tests.map((_, i) => <View key={i} style={[s.bar, { backgroundColor: i < done ? C.white : 'rgba(255,255,255,.35)' }]} />)}
        </Row>
        <Txt size={13} color="rgba(255,255,255,.9)">{t('nbDone')} {done}/{tests.length}</Txt>
      </LinearGradient>

      <Segments<Seg> value={seg} onChange={setSeg} items={[{ key: 'tests', label: t('tests') }, { key: 'results', label: t('results') }, { key: 'prefs', label: t('prefs') }]} />

      {seg === 'tests' && tests.map((x) => (
        <Card key={x.key} style={[s.row, x.booked && { backgroundColor: C.lavender }]} onPress={() => router.push(x.booked ? '/plan' : '/booking')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={12} style={{ flex: 1 }}>
              <Circle size={38} bg={x.last ? C.mint : x.booked ? C.lime : C.mintSoft} style={{ borderRadius: 12 }}><Icon d={x.last ? ICON.check : ICON.drop} size={18} /></Circle>
              <View style={{ flex: 1 }}>
                <Txt size={17} weight="700">{x.name}</Txt>
                <Txt size={12} color={C.muted}>
                  {x.booked ? t('confirmed') : x.last ? t('lastDone', { d: when(x.last.taken_at, locale, { month: 'short', year: 'numeric' }) }) : t('due')} · {t('every', { n: x.every_months })}
                </Txt>
              </View>
            </Row>
            <Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} color={C.muted} size={16} />
          </Row>
        </Card>
      ))}

      {seg === 'results' && (
        <>
          {!mine.length && <Card><Row gap={10}><Icon d={ICON.shield} color={C.teal} /><Txt size={15} style={{ flex: 1 }}>{t('noResults')}</Txt></Row></Card>}
          {mine.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={16} weight="700" style={{ flex: 1 }}>{pick(r as never, 'title')}</Txt>
                {r.flag && <Pill text={t(r.flag as Key)} tone={flagTone(r.flag)} />}
              </Row>
              {r.value && <Txt size={22} weight="800" color={C.teal}>{r.value} <Txt size={14} color={C.muted}>{r.unit ?? ''}</Txt></Txt>}
              {r.range && r.range.low !== null && r.range.high !== null && <Txt size={12} color={C.muted}>{t('range', { a: r.range.low, b: r.range.high })}</Txt>}
              {!!pick(r as never, 'summary') && <Txt size={14} color={C.inkSoft}>{pick(r as never, 'summary')}</Txt>}
              <Txt size={12} color={C.muted}>{when(r.taken_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })}{r.doctor ? ' · ' + pick(r.doctor as never, 'name') : ''}</Txt>
              {r.files.map((f) => (
                <Pressable key={f.id} onPress={async () => { try { await Linking.openURL(await api.fileLink(f.id)); } catch {} }} accessibilityRole="link">
                  <Row gap={6}><Icon d={ICON.file} size={16} color={C.teal} /><Txt size={14} weight="600" color={C.teal}>{f.filename}</Txt></Row>
                </Pressable>
              ))}
            </Card>
          ))}
          {notes.length > 0 && <Txt size={18} weight="800" style={{ marginTop: 6 }}>{t('doctorNotes')}</Txt>}
          {notes.map((n) => (
            <Card key={n.id} style={{ gap: 4, backgroundColor: C.yellow }}>
              <Txt size={15}>{n.body}</Txt>
              <Txt size={12} color={C.yellowInk}>{pick(n.doctor as never, 'name')} · {when(n.created_at, locale, { day: 'numeric', month: 'short' })}</Txt>
            </Card>
          ))}
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button title={t('fullRecord')} tone="ghost" onPress={() => router.push('/record')} icon={<Icon d={ICON.file} size={16} />} /></View>
            <View style={{ flex: 1 }}><Button title={t('messages')} tone="ghost" onPress={() => router.push('/messages')} icon={<Icon d={ICON.chat} size={16} />} /></View>
          </Row>
        </>
      )}

      {seg === 'prefs' && (
        <Card style={{ gap: 10 }}>
          {(prefs.length ? prefs : [t('noPrefs')]).map((p) => <Row key={p} gap={8}><Icon d={ICON.check} color={C.teal} size={16} /><Txt size={15}>{p}</Txt></Row>)}
          {plan?.prefs.includes('companion_reminders') && <Txt size={13} color={C.muted}>{t('companionNote')}</Txt>}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { borderRadius: R.card, padding: 18, gap: 4 },
  bar: { width: 20, height: 4, borderRadius: 2 },
  row: { paddingVertical: 14 },
});
