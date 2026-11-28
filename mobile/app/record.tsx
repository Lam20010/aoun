import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Pill, Row, Segments, Txt, flagTone } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT, when, type Key } from '../src/i18n';
import { api } from '../src/api';
import type { Rec, Records } from '../src/types';

type F = 'all' | 'aoun' | 'hospital' | 'clinic' | 'lab';

/**
 * Every report and result the person has, from hospitals, clinics, labs and Aoun, kept with them.
 * Only a doctor they book with can open it, and every opening shows here.
 */
export default function RecordScreen() {
  const { t, lang, locale, pick } = useT();
  const [rec, setRec] = useState<Records | null>(null);
  const [f, setF] = useState<F>('all');

  useFocusEffect(useCallback(() => {
    api.records().then(setRec).catch(() => setRec({ records: [], files: [], notes: [], referrals: [] }));
  }, []));

  const keep = (r: Rec) => f === 'all' || (f === 'aoun' ? r.source === 'aoun' : r.facility.kind === f || (f === 'clinic' && r.facility.kind === 'phc' && r.source !== 'aoun'));
  const list = (rec?.records ?? []).filter(keep);

  useReadable([t('recordTitle'), ...list.slice(0, 8).map((r) => pick(r as never, 'title') + '، ' + (r.value ?? '') + ' ' + (r.unit ?? '') + '، ' + pick(r.facility as never, 'name'))]);

  const open = async (id: string) => { try { await Linking.openURL(await api.fileLink(id)); } catch {} };

  return (
    <Screen title={t('recordTitle')}>
      <Card style={{ backgroundColor: C.lavender }}>
        <Row gap={10}><Icon d={ICON.shield} color={C.teal} /><Txt size={14} style={{ flex: 1 }}>{t('recordNote')}</Txt></Row>
      </Card>

      <Segments<F> value={f} onChange={setF} items={[
        { key: 'all', label: t('filterAll') }, { key: 'aoun', label: t('filterAoun') }, { key: 'hospital', label: t('filterHospitals') },
        { key: 'clinic', label: t('filterClinics') }, { key: 'lab', label: t('filterLabs') },
      ]} />

      {!rec && <ActivityIndicator color={C.teal} />}
      {rec && !list.length && <Card><Txt size={15} color={C.inkSoft}>{t('noResults')}</Txt></Card>}
      {list.map((r) => (
        <Card key={r.id} style={{ gap: 5 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={16} weight="700" style={{ flex: 1 }}>{pick(r as never, 'title')}</Txt>
            {r.flag && <Pill text={t(r.flag as Key)} tone={flagTone(r.flag)} />}
          </Row>
          {r.value && (
            <Row gap={6}>
              <Txt size={20} weight="800" color={C.teal}>{r.value}</Txt>
              <Txt size={13} color={C.muted}>{r.unit ?? ''}</Txt>
              {r.range && r.range.low !== null && r.range.high !== null && <Txt size={12} color={C.muted}>· {t('range', { a: r.range.low, b: r.range.high })}</Txt>}
            </Row>
          )}
          {!!pick(r as never, 'summary') && <Txt size={14} color={C.inkSoft}>{pick(r as never, 'summary')}</Txt>}
          <Row gap={6}>
            <Icon d={r.facility.kind === 'hospital' ? ICON.heart : r.facility.kind === 'lab' ? ICON.drop : ICON.pin} size={14} color={C.muted} />
            <Txt size={12} color={C.muted} style={{ flex: 1 }}>
              {pick(r.facility as never, 'name')} · {when(r.taken_at, locale, { day: 'numeric', month: 'short', year: 'numeric' })}{r.doctor ? ' · ' + pick(r.doctor as never, 'name') : ''}
            </Txt>
          </Row>
          {r.files.map((x) => (
            <Pressable key={x.id} onPress={() => open(x.id)} accessibilityRole="link">
              <Row gap={6}><Icon d={ICON.file} size={16} color={C.teal} /><Txt size={14} weight="600" color={C.teal}>{x.filename}</Txt></Row>
            </Pressable>
          ))}
        </Card>
      ))}

      {!!rec?.files.filter((x) => !x.record_id).length && (
        <Card style={{ gap: 8 }}>
          <Txt size={17} weight="800">{t('files')}</Txt>
          {rec!.files.filter((x) => !x.record_id).map((x) => (
            <Pressable key={x.id} onPress={() => open(x.id)} accessibilityRole="link">
              <Row gap={6}><Icon d={ICON.file} size={16} color={C.teal} /><Txt size={14} weight="600" color={C.teal}>{x.filename}</Txt></Row>
            </Pressable>
          ))}
        </Card>
      )}

      {!!rec?.referrals.length && (
        <Card style={{ gap: 8 }}>
          <Txt size={17} weight="800">{t('referrals')}</Txt>
          {rec!.referrals.map((x, i) => (
            <Row key={i} gap={8}><Icon d={ICON.diag} size={16} color={C.teal} />
              <Txt size={14} style={{ flex: 1 }}>{t(x.kind === 'genetic_counselling' ? 'geneticReferral' : 'specialistReferral')} · {when(x.created_at, locale, { day: 'numeric', month: 'short' })}</Txt>
            </Row>
          ))}
        </Card>
      )}

    </Screen>
  );
}
