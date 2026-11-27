import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Pill, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C, R } from '../src/theme';
import { useT, when } from '../src/i18n';
import { useApp } from '../src/store';
import { api, ApiError, refresh } from '../src/api';
import { placeName } from '../src/data/plan';
import { scheduleAll } from '../src/notify';
import type { Slot } from '../src/types';

/** Open times at the centers near the person, each with its doctor and clinic. */
export default function Booking() {
  const { t, rtl, lang, locale, pick } = useT();
  const me = useApp((s) => s.me);
  const [female, setFemale] = useState(me?.gender === 'f');
  const [femaleSet, setFemaleSet] = useState(false);
  // Default to a female doctor for women once the person has loaded (they can switch it off).
  useEffect(() => { if (me && !femaleSet) { setFemale(me.gender === 'f'); setFemaleSet(true); } }, [me, femaleSet]);
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [districts, setDistricts] = useState<{ key: string; ar: string; en: string }[]>([]);
  useEffect(() => { api.catalog().then((c) => setDistricts(c.districts ?? [])).catch(() => {}); }, []);
  const [paid, setPaid] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setSlots(null);
    api.slots({ days: 10, female, district, private: paid }).then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [female, district, paid]);
  useEffect(() => { load(); }, [load]);

  const dayKey = (s: Slot) => when(s.iso, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = useMemo(() => Array.from(new Set((slots ?? []).map(dayKey))), [slots]);
  useEffect(() => { if (days.length && (!day || !days.includes(day))) setDay(days[0]); }, [days, day]);
  const shown = (slots ?? []).filter((s) => dayKey(s) === day);

  useReadable([t('bookingTitle'), ...shown.slice(0, 6).map((s) => when(s.iso, locale, { hour: 'numeric', minute: '2-digit' }) + '، ' + placeName(s, t, lang) + (s.doctor ? '، ' + pick(s.doctor as never, 'name') : ''))]);

  const book = (s: Slot) => {
    const doctor = s.doctor ? pick(s.doctor as never, 'name') : placeName(s, t, lang);
    const cost = s.cost ? '\n' + (s.cost.free ? t('freeSehhaty') : (lang === 'ar' ? s.cost.note_ar : s.cost.note_en)) : '';
    Alert.alert(t('bookThis'), t('bookAsk', { when: when(s.iso, locale), doctor }) + cost, [
      { text: t('back'), style: 'cancel' },
      { text: t('confirm'), onPress: async () => {
        setBusy(true);
        try {
          await api.book(s.id);
          await refresh();
          const st = useApp.getState();
          if (st.remindersOn) api.meds().then((r) => scheduleAll(r.meds, st.plan, st.lang)).catch(() => {});
          router.replace('/plan');
        } catch (e) {
          Alert.alert(t('bookThis'), e instanceof ApiError && e.status === 409 ? t('slotTaken') : t('offline'));
          load();
        } finally { setBusy(false); }
      } },
    ]);
  };

  return (
    <Screen title={t('bookingTitle')}>
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={15} weight="600">{t('femaleOnly')}</Txt>
          <Switch value={female} onValueChange={(v) => { setFemaleSet(true); setFemale(v); }} trackColor={{ true: C.teal, false: C.line }} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={15} weight="600" style={{ flex: 1 }}>{t('showPrivate')}</Txt>
          <Switch value={paid} onValueChange={setPaid} trackColor={{ true: C.teal, false: C.line }} />
        </Row>
        <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
          {districts.map((d) => {
            const on = (district ?? me?.district) === d.key;
            return (
              <Pressable key={d.key} onPress={() => setDistrict(d.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ backgroundColor: on ? C.dark : C.bg, borderRadius: R.pill, paddingVertical: 7, paddingHorizontal: 12 }}>
                <Txt size={13} weight="700" color={on ? C.white : C.ink}>{(lang === 'ar' ? d.ar : d.en) + (d.key === me?.district ? ' · ' + t('myDistrict') : '')}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {days.map((d) => {
          const on = d === day;
          const iso = d + 'T12:00:00+03:00';
          return (
            <Pressable key={d} onPress={() => setDay(d)} style={{ backgroundColor: on ? C.dark : C.white, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 58 }}>
              <Txt size={12} color={on ? C.white : C.muted} center>{when(iso, locale, { weekday: 'short' })}</Txt>
              <Txt size={18} weight="800" color={on ? C.white : C.ink} center>{when(iso, locale, { day: 'numeric' })}</Txt>
            </Pressable>
          );
        })}
      </View>

      {slots === null && <ActivityIndicator color={C.teal} />}
      {slots !== null && !shown.length && <Card><Txt size={15} color={C.inkSoft}>{t('noSlots')}</Txt></Card>}
      {shown.map((s) => (
        <Card key={s.id} onPress={busy ? undefined : () => book(s)} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={20} weight="800" color={C.teal}>{when(s.iso, locale, { hour: 'numeric', minute: '2-digit' })}</Txt>
            <Pill text={t('placesLeft', { n: s.remaining })} tone="gray" />
          </Row>
          <Row gap={6}><Icon d={ICON.pin} size={16} color={C.inkSoft} /><Txt size={15} style={{ flex: 1 }}>{placeName(s, t, lang)}{s.kind === 'center' && lang === 'ar' ? ' · حي ' + s.district_ar : ''}</Txt></Row>
          {s.doctor && <Row gap={6}><Icon d={ICON.people} size={16} color={C.inkSoft} /><Txt size={14} style={{ flex: 1 }}>{pick(s.doctor as never, 'name')} · {pick(s.doctor as never, 'clinic')}</Txt></Row>}
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {s.cost && <Pill text={s.cost.free ? t('freeSehhaty') : t('privateClinic') + ' · ' + t('youPay', { n: s.cost.you_pay })} tone={s.cost.free ? 'mint' : 'amber'} />}
            {s.female_staff && <Pill text={t('femaleStaff')} tone="mint" />}
            {s.wheelchair && <Pill text={t('wheelchair')} tone="mint" />}
          </Row>
        </Card>
      ))}
      <View style={{ height: 20 }} />
    </Screen>
  );
}
