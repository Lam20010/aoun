import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Button, Card, Circle, Pill, Row, Txt } from '../src/ui/kit';
import { Icon, ICON } from '../src/ui/Icon';
import { PlanMap } from '../src/ui/PlanMap';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT, when, type Key } from '../src/i18n';
import { useApp } from '../src/store';
import { api, refresh } from '../src/api';
import { googleDirections, openDarb, placeName, planRows, uberTo } from '../src/data/plan';
import type { Route } from '../src/types';
import { scheduleAll } from '../src/notify';

const STEPS: [Key, Key][] = [
  ['stepBooked', 'stepBookedSub'], ['stepReminder', 'stepReminderSub'], ['stepTrip', 'stepTripSub'],
  ['stepTest', 'stepTest'], ['stepReview', 'stepReviewSub'], ['stepResult', 'stepResultSub'],
];

/** The whole visit: when, where, which doctor and clinic, the map, and how to get there. */
export default function PlanScreen() {
  const { t, lang, locale, pick } = useT();
  const plan = useApp((s) => s.plan);
  const [busy, setBusy] = useState(false);
  const slot = plan?.slot ?? null;
  const rows = plan ? planRows(plan, t, pick, lang) : [];
  const place = slot ? placeName(slot, t, lang) : '';
  const [drive, setDrive] = useState<Route | null>(null);
  const [transitR, setTransitR] = useState<Route | null>(null);
  useEffect(() => {
    if (!plan?.confirmed || !slot || slot.kind === 'home_visit') return;
    api.route('plan', 'driving').then(setDrive).catch(() => {});
    api.route('plan', 'transit').then(setTransitR).catch(() => {});
  }, [plan?.confirmed, slot?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const addToCalendar = async () => { try { await Linking.openURL(await api.calendarLink()); } catch { Alert.alert(t('offline')); } };

  useReadable(slot ? [when(slot.iso, locale), ...rows.map((r) => r.text)] : [t('noBooking')]);

  const cancel = () => Alert.alert(t('cancelAppt'), t('cancelAsk'), [
    { text: t('back'), style: 'cancel' },
    { text: t('cancelAppt'), style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        await api.cancel(); await refresh();
        const st = useApp.getState();
        if (st.remindersOn) api.meds().then((r) => scheduleAll(r.meds, st.plan, st.lang)).catch(() => {});
      } catch {} finally { setBusy(false); }
    } },
  ]);

  if (!slot) {
    return (
      <Screen title={t('planTitle')}>
        <Card style={{ gap: 10 }}>
          <Txt size={18} weight="700">{t('noBooking')}</Txt>
          <Button title={t('bookAppt')} onPress={() => router.push('/incoming')} icon={<Icon d={ICON.phone} color={C.white} size={16} />} />
          <Button title={t('pickTime')} tone="ghost" onPress={() => router.push('/booking')} icon={<Icon d={ICON.calendar} size={16} />} />
        </Card>
      </Screen>
    );
  }

  const reach = slot.kind !== 'home_visit';
  return (
    <Screen title={t('planTitle')}>
      <Card style={{ gap: 8, backgroundColor: C.mintSoft }}>
        <Pill text={plan!.confirmed ? '✓ ' + t('confirmed') : t('pending')} tone={plan!.confirmed ? 'mint' : 'amber'} />
        <Txt size={24} weight="800">{when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</Txt>
        <Txt size={14} color={C.inkSoft}>{when(slot.iso, locale, { day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
        {rows.map((r, i) => (
          <Row key={i} gap={8}><Icon d={r.icon} size={17} color={C.inkSoft} /><Txt size={15} color={r.accent ? C.teal : C.ink} weight={r.accent ? '700' : '400'} style={{ flex: 1 }}>{r.text}</Txt></Row>
        ))}
      </Card>

      {slot.doctor && (
        <Card style={{ gap: 4 }}>
          <Row gap={12}>
            <Circle size={46} bg={C.lavender}><Icon d={ICON.people} /></Circle>
            <View style={{ flex: 1 }}>
              <Txt size={17} weight="800">{pick(slot.doctor as never, 'name')}</Txt>
              <Txt size={13} color={C.muted}>{pick(slot.doctor as never, 'specialty')}</Txt>
              <Txt size={14} color={C.teal} weight="600">{pick(slot.doctor as never, 'clinic')}</Txt>
            </View>
          </Row>
          {plan!.confirmed && <Button title={t('messages')} tone="ghost" onPress={() => router.push('/messages')} icon={<Icon d={ICON.chat} size={16} />} />}
        </Card>
      )}

      {slot.cost && (
        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={17} weight="800">{t('costTitle')}</Txt>
            <Pill text={slot.cost.free ? t('free') : t('privateClinic')} tone={slot.cost.free ? 'mint' : 'amber'} />
          </Row>
          {slot.cost.free ? (
            <Txt size={14} color={C.inkSoft}>{lang === 'ar' ? slot.cost.note_ar : slot.cost.note_en}</Txt>
          ) : (
            <View style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={C.inkSoft}>{t('priceLbl')}</Txt><Txt size={14} weight="600">{slot.cost.price} SAR</Txt></Row>
              <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={C.inkSoft}>{t('insurancePays')}</Txt><Txt size={14} weight="600">{slot.cost.insurance_pays} SAR</Txt></Row>
              <Row style={{ justifyContent: 'space-between' }}><Txt size={15} weight="700">{t('youPayLbl')}</Txt><Txt size={17} weight="800" color={C.teal}>{slot.cost.you_pay} SAR</Txt></Row>
            </View>
          )}
          {!!plan!.sehhaty_ref && <Txt size={13} color={C.muted}>{t('sehhatyRef')}: {plan!.sehhaty_ref}</Txt>}
        </Card>
      )}

      {reach && (
        <>
          <PlanMap slot={slot} title={place} />
          <Txt size={18} weight="800">{t('tripTitle')}</Txt>
          {(drive || transitR) && (
            <Row gap={10}>
              {drive && <Card style={{ flex: 1, gap: 2 }}><Row gap={6}><Icon d={ICON.car} size={16} color={C.teal} /><Txt size={13} color={C.inkSoft}>{T('بالسيارة', 'By car')}</Txt></Row>
                <Txt size={20} weight="800">{drive.duration_min} {T('د', 'min')}</Txt><Txt size={12} color={C.muted}>{drive.distance_km} {T('كم', 'km')}{drive.source === 'estimate' ? T(' · تقدير', ' · estimate') : ' · Google'}</Txt></Card>}
              {transitR && <Card style={{ flex: 1, gap: 2 }}><Row gap={6}><Icon d={ICON.train} size={16} color={C.teal} /><Txt size={13} color={C.inkSoft}>{T('مترو وباص', 'Metro and bus')}</Txt></Row>
                <Txt size={20} weight="800">{transitR.duration_min} {T('د', 'min')}</Txt><Txt size={12} color={C.muted}>{transitR.source === 'estimate' ? T('تقدير', 'estimate') : 'Google'}</Txt></Card>}
            </Row>
          )}
          <View style={{ gap: 10 }}>
            <Button title={t('directions')} onPress={() => googleDirections(slot, 'driving')} icon={<Icon d={ICON.map} color={C.white} size={16} />} />
            <Button title={t('uber')} tone="mint" onPress={() => uberTo(slot, place)} icon={<Icon d={ICON.car} size={16} />} />
            <Row gap={10}>
              <View style={{ flex: 1 }}><Button title={t('transit')} tone="ghost" onPress={() => googleDirections(slot, 'transit')} icon={<Icon d={ICON.train} size={16} />} /></View>
              <View style={{ flex: 1 }}><Button title={t('darb')} tone="ghost" onPress={openDarb} icon={<Icon d={ICON.train} size={16} />} /></View>
            </Row>
            <Row gap={10}>
              {Platform.OS === 'ios' && <View style={{ flex: 1 }}><Button title={T('خرائط آبل', 'Apple Maps')} tone="ghost" onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${slot.lat},${slot.lon}&dirflg=d`)} icon={<Icon d={ICON.map} size={16} />} /></View>}
              <View style={{ flex: 1 }}><Button title={T('كريم', 'Careem')} tone="ghost" onPress={() => Linking.openURL('https://app.careem.com/rides')} icon={<Icon d={ICON.car} size={16} />} /></View>
            </Row>
          </View>
        </>
      )}

      {plan!.confirmed && <Button title={T('أضيفي الموعد للتقويم', 'Add to my calendar')} tone="ghost" onPress={addToCalendar} icon={<Icon d={ICON.calendar} size={16} />} />}

      <Txt size={18} weight="800">{t('steps')}</Txt>
      <Card style={{ gap: 12 }}>
        {STEPS.map(([title, sub], i) => {
          const done = i === 0 && plan!.confirmed;
          return (
            <Row key={title} gap={12}>
              <Circle size={30} bg={done ? C.teal : C.mintSoft}>{done ? <Icon d={ICON.check} size={15} color={C.white} width={2.4} /> : <Txt size={13} weight="700">{i + 1}</Txt>}</Circle>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="700">{t(title)}</Txt>
                {sub !== title && <Txt size={12} color={C.muted}>{t(sub)}</Txt>}
              </View>
            </Row>
          );
        })}
      </Card>

      <Row gap={10}>
        <View style={{ flex: 1 }}><Button title={t('changeAppt')} tone="ghost" onPress={() => router.push('/booking')} icon={<Icon d={ICON.calendar} size={16} />} /></View>
        <View style={{ flex: 1 }}><Button title={t('cancelAppt')} tone="ghost" disabled={busy} onPress={cancel} icon={<Icon d={ICON.close} size={16} />} /></View>
      </Row>
    </Screen>
  );
}
