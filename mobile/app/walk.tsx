// «ممشى الحي»: the neighbourhood walkway near home, the route (Google Directions on the server when a key
// is set), a 30-minute walk timer, and this week's minutes. Only minutes are saved: no route, no location.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { Screen } from '../src/ui/Screen';
import { RouteMap } from '../src/ui/RouteMap';
import { Icon, ICON } from '../src/ui/Icon';
import { Button, Card, Circle, Pill, Row, Segments, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { langInfo, useT } from '../src/i18n';
import { useApp } from '../src/store';
import { api } from '../src/api';
import type { Route, Walks } from '../src/types';

const GOAL = 30;

export default function Walk() {
  const { lang, locale } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const plan = useApp((s) => s.plan);
  const voice = useApp((s) => s.voice);
  const [route, setRoute] = useState<Route | null>(null);
  const [walks, setWalks] = useState<Walks | null>(null);
  const [filter, setFilter] = useState<'all' | 'walk' | 'health'>('walk');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [saved, setSaved] = useState<number | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => {
    api.route('walk', 'walking').then(setRoute).catch(() => {});
    api.walks().then(setWalks).catch(() => {});
  }, []));
  useEffect(() => () => { if (tick.current) clearInterval(tick.current); try { Speech.stop(); } catch {} }, []);

  const name = route ? (lang === 'ar' ? route.name_ar : route.name_en) : T('ممشى الحي', 'District walkway');
  const meters = route ? Math.round(route.distance_km * 1000) : 0;
  const sub = route ? T(`${route.duration_min} دقايق مشي · ${meters} م`, `${route.duration_min} min walk · ${meters} m`) : '…';
  const why = plan?.screening === 'diabetes' ? T('مشيك اليوم · المشي ٣٠ دقيقة يساعد السكر يبقى بالحد الطبيعي', 'Today\'s walk · 30 minutes helps keep blood sugar in range')
    : plan?.screening === 'hypertension' ? T('مشيك اليوم · المشي المنتظم ينزّل الضغط', 'Today\'s walk · regular walking lowers blood pressure')
    : T('مشيك اليوم · ٣٠ دقيقة تفرق في صحتك', 'Today\'s walk · 30 minutes makes a difference');
  const steps = route?.steps.length ? route.steps : [
    T('اطلعي من البيت وامشي على شارع الحي', 'Leave home and walk along the district street'),
    T('عند الإشارة لفّي يسار مع الرصيف', 'At the lights, turn left along the pavement'),
    T(`${name} قدّامك، لفّة كاملة ١٫٢ كم`, `${name} is ahead, one full loop is 1.2 km`)];
  const elapsed = startedAt ? Math.floor((now - startedAt) / 60000) : 0;
  const secs = startedAt ? Math.floor((now - startedAt) / 1000) % 60 : 0;

  useReadable([name, sub, why, ...steps]);

  const read = () => { try { Speech.stop(); Speech.speak([name, sub, ...steps].join('. '), { language: langInfo(lang).speech, rate: 0.95 }); } catch {} };
  const start = () => { setSaved(null); setStartedAt(Date.now()); setNow(Date.now()); tick.current = setInterval(() => setNow(Date.now()), 1000); };
  const stop = async () => {
    if (tick.current) clearInterval(tick.current);
    const m = Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 60000));
    setStartedAt(null);
    try { setWalks(await api.addWalk(m)); setSaved(m); } catch { setSaved(-1); }
  };
  const openMaps = () => route && Linking.openURL(Platform.OS === 'ios' ? route.links.apple : route.links.google);

  const max = Math.max(GOAL, ...(walks?.days.map((d) => d.minutes) ?? [0]));
  return (
    <Screen title={T('أماكن قريبة', 'Nearby')}>
      <Row gap={8}><Icon d={ICON.map} size={18} color={C.teal} /><Txt size={15} weight="700">{T('في حيّك', 'In your district')}</Txt></Row>
      <RouteMap points={route?.points ?? []} height={250} title={name} color={C.lime} />
      <Segments<'all' | 'walk' | 'health'> value={filter} onChange={setFilter}
        items={[{ key: 'all', label: T('الكل', 'All') }, { key: 'health', label: T('صحة', 'Health') }, { key: 'walk', label: T('ممشى', 'Walk') }]} />
      {filter !== 'walk' && plan?.slot && (
        <Card style={{ gap: 4 }}>
          <Pill text={T('موعدك', 'Your visit')} tone="mint" />
          <Txt size={16} weight="800">{lang === 'ar' ? plan.slot.center_ar : plan.slot.center_en ?? plan.slot.center_ar}</Txt>
          <Txt size={13} color={C.inkSoft}>{new Date(plan.slot.iso).toLocaleString(locale, { timeZone: 'Asia/Riyadh', weekday: 'long', hour: 'numeric', minute: '2-digit' })}</Txt>
        </Card>
      )}
      {filter !== 'health' && (
        <Card style={{ gap: 10 }}>
          <Txt size={13} weight="700" color={C.teal}>{why}</Txt>
          <Txt size={22} weight="800">{name}</Txt>
          <Txt size={14} color={C.inkSoft}>{sub}{route?.source === 'estimate' ? T(' · تقدير', ' · estimate') : ''}</Txt>
          {steps.map((st, i) => (
            <Row key={i} gap={10}><Circle size={26} bg={C.mintSoft}><Txt size={12} weight="800">{i + 1}</Txt></Circle><Txt size={14} style={{ flex: 1 }}>{st}</Txt></Row>
          ))}
          <Pressable onPress={read} accessibilityRole="button"><Row gap={6}><Icon d={ICON.mic} size={16} color={C.teal} /><Txt size={14} weight="700" color={C.teal}>{T('اقرئي لي المسار', 'Read me the route')}</Txt></Row></Pressable>
          {startedAt ? (
            <View style={{ gap: 8, alignItems: 'center' }}>
              <Txt size={40} weight="800" color={C.teal} center>{String(elapsed).padStart(2, '0')}:{String(secs).padStart(2, '0')}</Txt>
              <Txt size={13} color={C.inkSoft} center>{T(`من ${GOAL} دقيقة · ${voice === 'm' ? 'كمّل' : 'كمّلي'} على راحتك`, `of ${GOAL} minutes · go at your own pace`)}</Txt>
              <Button title={T('خلّصت المشي', 'I finished')} onPress={stop} icon={<Icon d={ICON.check} color={C.white} size={16} />} />
            </View>
          ) : (
            <Row gap={8}>
              <View style={{ flex: 1.4 }}><Button title={T(`ابدئي المشي ${GOAL} دقيقة`, `Start a ${GOAL}-minute walk`)} tone="mint" onPress={start} icon={<Icon d={ICON.walk} size={16} />} /></View>
              <View style={{ flex: 1 }}><Button title={T('الاتجاهات', 'Directions')} tone="ghost" onPress={openMaps} icon={<Icon d={ICON.map} size={16} />} /></View>
            </Row>
          )}
          {saved !== null && <Txt size={13} weight="700" color={saved > 0 ? C.teal : C.red}>{saved > 0 ? T(`سجّلنا ${saved} دقيقة. يعطيك العافية!`, `Saved ${saved} min. Well done!`) : T('ما قدرنا نحفظ المشي. جرّبي بعدين.', 'Could not save the walk.')}</Txt>}
        </Card>
      )}
      {walks && (
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={16} weight="800">{T('مشيك هالأسبوع', 'Your walking this week')}</Txt>
            <Txt size={14} weight="800" color={C.teal}>{walks.week_minutes}/{walks.goal_minutes} {T('د', 'min')}</Txt>
          </Row>
          <Row gap={6} style={{ alignItems: 'flex-end', height: 90 }}>
            {walks.days.map((d) => (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: '70%', height: Math.max(4, d.minutes / max * 70), borderRadius: 6, backgroundColor: d.minutes >= GOAL ? C.lime : C.mint }} />
                <Txt size={10} color={C.muted} center>{new Date(d.day + 'T12:00:00+03:00').toLocaleDateString(locale, { weekday: 'narrow' })}</Txt>
              </View>
            ))}
          </Row>
          <Txt size={12} color={C.muted}>{T('نحفظ الدقايق بس، بدون مسار أو موقع. طبيبك يشوف مجموع الأسبوع.', 'Only minutes are saved, no route or location. Your doctor sees the weekly total.')}</Txt>
        </Card>
      )}
    </Screen>
  );
}
