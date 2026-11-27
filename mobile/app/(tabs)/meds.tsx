import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../../src/ui/Icon';
import { Card, Circle, Pill, Row, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C } from '../../src/theme';
import { t as tr, useT, when, type Key } from '../../src/i18n';
import { useApp } from '../../src/store';
import { api } from '../../src/api';
import { askPermission, scheduleAll } from '../../src/notify';
import type { Med } from '../../src/types';

/** Medicines and vitamins the doctor added after the results, with reminders at their times. */
export default function Meds() {
  const { t, lang, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const remindersOn = useApp((s) => s.remindersOn);
  const plan = useApp((s) => s.plan);
  const [meds, setMeds] = useState<Med[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    setBusy(true);
    api.meds().then(async (r) => {
      setMeds(r.meds);
      if (useApp.getState().remindersOn) {
        const lang = useApp.getState().lang;
        const n = await scheduleAll(r.meds, useApp.getState().plan, lang).catch(() => 0);
        setNote(tr(lang, 'reminderSet', { n }));
      }
    }).catch(() => {}).finally(() => setBusy(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (on: boolean) => {
    if (on && !(await askPermission().catch(() => false))) return;
    useApp.getState().set({ remindersOn: on });
    if (on) setNote(t('reminderSet', { n: await scheduleAll(meds, plan, lang).catch(() => 0) }));
    else { await scheduleAll([], null, lang).catch(() => 0); setNote(t('remindersOff')); }
  };

  const active = meds.filter((m) => m.active);
  const past = meds.filter((m) => !m.active);
  const timeTxt = (hm: string) => {
    const [h, m] = hm.split(':').map(Number);
    return new Date(Date.UTC(2026, 0, 1, h - 3, m)).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' });
  };

  useReadable(active.length ? active.map((m) => pick(m as never, 'name') + '، ' + m.dose + '، ' + m.times.map(timeTxt).join(' و ')) : [t('noMeds')]);

  const MedCard = ({ m }: { m: Med }) => (
    <Card style={{ gap: 8, opacity: m.active ? 1 : 0.7 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={10} style={{ flex: 1 }}>
          <Circle size={40} bg={m.kind === 'medication' ? C.lavender : C.yellow}><Icon d={ICON.pill} size={19} /></Circle>
          <View style={{ flex: 1 }}>
            <Txt size={17} weight="800">{pick(m as never, 'name')}</Txt>
            <Txt size={13} color={C.muted}>{m.dose}{m.with_food ? ' · ' + t('withFood') : ''}</Txt>
          </View>
        </Row>
        <Pill text={t(m.kind as Key)} tone={m.kind === 'medication' ? 'dark' : 'mint'} />
      </Row>
      {m.active && (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Icon d={ICON.clock} size={16} color={C.teal} />
          {m.times.map((x) => <Pill key={x} text={timeTxt(x)} tone="gray" />)}
        </Row>
      )}
      {!!pick(m as never, 'instructions') && <Txt size={14} color={C.inkSoft}>{pick(m as never, 'instructions')}</Txt>}
      <Txt size={12} color={C.muted}>
        {m.days ? t('days', { n: m.days }) : t('ongoing')} · {when(m.start_date + 'T09:00:00+03:00', locale, { day: 'numeric', month: 'short' })}
        {m.doctor ? ' · ' + pick(m.doctor as never, 'name') : ''}{' · ' + pick(m as never, 'facility')}
      </Txt>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 200, gap: 12 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      <Txt size={28} weight="800">{t('medsTitle')}</Txt>
      <Card style={{ backgroundColor: C.mintSoft }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={10} style={{ flex: 1 }}>
            <Icon d={ICON.bell} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Txt size={16} weight="700">{remindersOn ? t('remindersOn') : t('enableReminders')}</Txt>
              {!!note && <Txt size={12} color={C.muted}>{note}</Txt>}
            </View>
          </Row>
          <Switch value={remindersOn} onValueChange={toggle} trackColor={{ true: C.teal, false: C.line }} accessibilityLabel={t('enableReminders')} />
        </Row>
      </Card>
      <Txt size={18} weight="800">{t('active')}</Txt>
      {!active.length && <Card><Txt size={15} color={C.inkSoft}>{t('noMeds')}</Txt></Card>}
      {active.map((m) => <MedCard key={m.id} m={m} />)}
      {past.length > 0 && <Txt size={18} weight="800" style={{ marginTop: 8 }}>{t('past')}</Txt>}
      {past.map((m) => <MedCard key={m.id} m={m} />)}
    </ScrollView>
  );
}
