// Home: a portal-style top (logo bar + a banner with three live slides), then
//   1. «توعية»: short awareness cards (the person's own screening first),
//   2. «جديد في حيّك»: health events near home (a mammography truck in the park, free checks after
//      Friday prayer, a group walk) and what the Ministry approved for the district,
//   3. «خطتك»: one line showing how far the plan has come, with the visit card,
//   4. «رعايتي»: care plan, family, the walkway, «حيّ عون», «وقت الإبرة؟», record and messages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Icon, ICON } from '../../src/ui/Icon';
import { Skyline } from '../../src/ui/Skyline';
import { HScroll } from '../../src/ui/HScroll';
import { Button, Card, Circle, Row, Txt } from '../../src/ui/kit';
import { useReadable } from '../../src/ui/useReadable';
import { C, GRAD, R } from '../../src/theme';
import { langInfo, useT, when } from '../../src/i18n';
import { useApp } from '../../src/store';
import { api, refresh } from '../../src/api';
import { placeName } from '../../src/data/plan';
import { demoFirstName } from '../../src/data/profile';
import { freshDay, GAME0 } from '../../src/data/game';
import { L, Tip, tipsFor } from '../../src/data/awareness';
import type { DistrictNews, Records, Walks } from '../../src/types';

type Ev = { id: string; kind: string; start: string; end: string; title_ar: string; title_en: string; place_ar: string; place_en: string;
  lat: number; lon: number; who_ar: string; who_en: string; free: boolean; bookable?: boolean };
const EV_STYLE: Record<string, [string, string, string]> = {
  mammo_truck: ['#FCE8EE', '#A33A5C', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4'],
  bp_check: ['#FFF6E0', '#7A4E00', 'M3 12h4l2-5 4 10 2-5h6'],
  group_walk: ['#FFF3DC', '#7A4E00', 'M13 4a1.5 1.5 0 1 0 0-.01M9 21l2-6 3 3v3M7 12l3-3 3 2 3 1'],
  vaccine: ['#E5F3FC', '#1574AD', 'M18 2l4 4M17 7l3-3M19 9L9 19l-4 1 1-4L16 6zM12 10l2 2'],
  talk: ['#E1EBF3', '#3D6D94', 'M7 8h10M7 12h6M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  mobile_clinic: ['#E5F3FC', '#1574AD', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4'],
  evening_hours: ['#E9E9F7', '#3E3E8F', 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
};

export default function Home() {
  const { t, rtl, lang, locale, pick } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const insets = useSafeAreaInsets();
  const plan = useApp((s) => s.plan);
  const me = useApp((s) => s.me);
  const voice = useApp((s) => s.voice);
  const game = useApp((s) => s.game);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [news, setNews] = useState<DistrictNews & { events?: Ev[] } | null>(null);
  const [walks, setWalks] = useState<Walks | null>(null);
  const [rec, setRec] = useState<Records | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [ev, setEv] = useState<Ev | null>(null);
  const [gridW, setGridW] = useState(0);
  const load = useCallback(() => {
    setBusy(true);
    refresh().then(() => setOffline(false)).catch(() => setOffline(true)).finally(() => setBusy(false));
    api.district().then((d) => setNews(d as never)).catch(() => {});
    api.walks().then(setWalks).catch(() => {});
    api.records().then(setRec).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const slot = plan?.slot ?? null;
  const seh = me?.sehhaty;
  const name = (lang === 'ar' ? seh?.first_name_ar : seh?.first_name_en) || demoFirstName(me?.gender ?? voice, lang);
  const pts = freshDay(game ?? GAME0(''), '').pts;
  const tips = useMemo(() => tipsFor(plan?.screening), [plan?.screening]);
  const events = (news?.events ?? []).slice(0, 6);
  const challenge = news?.interventions.find((x) => x.kind === 'challenge');

  // the plan, one line
  const results = (rec?.records ?? []).filter((r) => r.source === 'aoun');
  const visited = !!slot && new Date(slot.iso).getTime() < Date.now();
  const raw = [
    { label: T('الحجز', 'Booked'), done: !!slot },
    { label: T('التأكيد', 'Confirmed'), done: !!plan?.confirmed },
    { label: T('يوم الفحص', 'Visit'), done: visited || results.length > 0 },
    { label: T('النتيجة', 'Result'), done: results.length > 0 },
    { label: T('المتابعة', 'Follow-up'), done: results.length > 0 && (rec?.notes.length ?? 0) > 0 },
  ];
  // A step counts only when the ones before it are done (a result from an older visit does not skip ahead).
  const steps = raw.map((x, i) => ({ ...x, done: raw.slice(0, i + 1).every((y) => y.done) }));
  const doneN = steps.filter((x) => x.done).length;
  const next = steps.find((x) => !x.done);
  const nextText = !slot ? T('الخطوة الجاية: نحجز موعد فحصك', 'Next: book your check-up')
    : !plan?.confirmed ? T('الخطوة الجاية: أكّدي الموعد', 'Next: confirm the visit')
    : !visited ? T(`الخطوة الجاية: فحصك ${when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`, `Next: your visit, ${when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`)
    : !results.length ? T('الخطوة الجاية: الطبيب يراجع نتيجتك', 'Next: the doctor reviews your result')
    : T('نتيجتك وصلت، شوفي ملاحظات الطبيب', 'Your result is in; see the doctor\'s notes');

  useReadable([
    t('hello') + ' ' + name, nextText,
    ...tips.slice(0, 2).map((x) => L(x.title, lang)),
    ...events.slice(0, 3).map((e) => pick(e as never, 'title') + '، ' + pick(e as never, 'place')),
  ]);

  const say = (text: string) => { try { Speech.stop(); Speech.speak(text, { language: langInfo(lang).speech, rate: 0.95 }); } catch {} };
  const tileW = gridW ? (gridW - 12) / 2 : undefined;
  const tiles: { key: string; title: string; sub: string; icon: string; bg: string; to: string; wide?: boolean }[] = [
    { key: 'care', title: t('carePlan'), sub: t('carePlanSub'), icon: ICON.doc, bg: C.yellow, to: '/care' },
    { key: 'family', title: t('family'), sub: T('شجرة عائلتك', 'Your family tree'), icon: ICON.people, bg: C.mint, to: '/family' },
    { key: 'walk', title: t('walk'), sub: walks ? T(`${walks.week_minutes} من ${walks.goal_minutes} دقيقة هالأسبوع`, `${walks.week_minutes} of ${walks.goal_minutes} min this week`) : t('walkSub'), icon: ICON.walk, bg: C.mintSoft, to: '/walk', wide: true },
    { key: 'game', title: t('game'), sub: T(`${pts} عملة · ساعدي جيرانك`, `${pts} coins · help neighbours`), icon: ICON.game, bg: '#E1EBF3', to: '/game' },
    { key: 'needle', title: t('needle'), sub: t('needleSub'), icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', bg: '#FFF3DC', to: '/game?mode=calm' },
    { key: 'record', title: t('record'), sub: t('recordSub'), icon: ICON.file, bg: C.lavender, to: '/record' },
    { key: 'messages', title: t('messages'), sub: t('messagesSub'), icon: ICON.chat, bg: C.mintCard, to: '/messages' },
  ];
  // Banner slides, like the Ministry portal: your next step, the nearest health event, the district challenge.
  const ev0 = events[0];
  const slides: { kicker: string; title: string; text: string; cta: string; go: () => void }[] = [
    { kicker: `${t('hello')} ${name}${me ? ' · ' + (lang === 'ar' ? 'حي ' + me.district_ar : me.district_en) : ''}`, title: nextText,
      text: T(`${doneN} من ${steps.length} خطوات في خطتك`, `${doneN} of ${steps.length} steps of your plan`),
      cta: slot ? T('خطة الزيارة', 'Visit plan') : t('bookAppt'), go: () => router.push(slot ? '/plan' : '/booking') },
    ...(ev0 ? [{ kicker: T('جديد في حيّك', 'New in your district'), title: pick(ev0 as never, 'title'),
      text: `${pick(ev0 as never, 'place')} · ${when(ev0.start, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`,
      cta: T('التفاصيل', 'Details'), go: () => setEv(ev0) }] : []),
    ...(challenge ? [{ kicker: T('من وزارة الصحة لحيّك', 'From the Ministry for your district'), title: pick(challenge as never, 'title'),
      text: T(`${challenge.progress}/${challenge.goal} · كل موعد ومشي يحسب للحي`, `${challenge.progress}/${challenge.goal} · every visit and walk counts`),
      cta: T('العبي حيّ عون', 'Play Aoun district'), go: () => router.push('/game') }] : []),
  ];
  const [hi, setHi] = useState(0);
  const touched = useRef(0);
  const n = slides.length, cur = slides[((hi % n) + n) % n];
  const move = (d: number) => { touched.current = Date.now(); setHi((x) => x + d); };
  useEffect(() => { const i = setInterval(() => { if (Date.now() - touched.current > 8000) setHi((x) => x + 1); }, 7000); return () => clearInterval(i); }, []);
  const swipeX = useRef(0);

  const head = (title: string, sub?: string) => (
    <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 10 }}>
      <Txt size={21} weight="800">{title}</Txt>
      {!!sub && <Txt size={13} color={C.muted}>{sub}</Txt>}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 210 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      {/* top bar: the Aoun logo, then «أنا معك» and settings */}
      <View style={[s.bar, { paddingTop: insets.top + 8 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Image source={require('../../assets/aoun-lockup.png')} style={{ width: 118, height: 41 }} resizeMode="contain" accessibilityLabel={t('aoun')} />
          <Row gap={8}>
            <Pressable onPress={() => router.push('/assistant')} accessibilityRole="button" accessibilityLabel={t('assistantMenu')} hitSlop={6}><Circle size={40} bg={C.mintSoft}><Icon d={ICON.heart} size={20} color={C.teal} /></Circle></Pressable>
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={6}><Circle size={40} bg={C.mintSoft}><Icon d={ICON.sliders} size={19} color={C.teal} /></Circle></Pressable>
          </Row>
        </Row>
      </View>

      {/* banner: three live slides, swipe or tap the arrows */}
      <View onTouchStart={(e) => { swipeX.current = e.nativeEvent.pageX; }}
        onTouchEnd={(e) => { const dx = e.nativeEvent.pageX - swipeX.current; if (Math.abs(dx) > 40) move(dx > 0 === rtl ? -1 : 1); }}>
        <LinearGradient colors={['#002336', '#0B3A55', '#1574AD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Image source={require('../../assets/aoun-mark-white.png')} style={s.heroMark} resizeMode="contain" />
          <Txt size={12} weight="700" color="#59C2F9">{cur.kicker}</Txt>
          <Txt size={22} weight="800" color={C.white} lines={3} style={{ lineHeight: 32 }}>{cur.title}</Txt>
          <Txt size={13} color="#D6EEFC" lines={2}>{cur.text}</Txt>
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Pressable onPress={cur.go} accessibilityRole="button" style={s.heroBtn}><Txt size={14} weight="800" color="#002336">{cur.cta}</Txt></Pressable>
            <Row gap={8}>
              <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel={T('السابق', 'Previous')} style={s.heroArrow}><Icon d={rtl ? ICON.chevronRight : ICON.chevronLeft} size={18} color={C.white} /></Pressable>
              <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel={T('التالي', 'Next')} style={s.heroArrow}><Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} size={18} color={C.white} /></Pressable>
            </Row>
          </Row>
          <Row gap={5} style={{ marginTop: 12 }}>
            {slides.map((_, i) => <View key={i} style={{ width: i === ((hi % n) + n) % n ? 22 : 7, height: 6, borderRadius: 3, backgroundColor: i === ((hi % n) + n) % n ? '#59C2F9' : 'rgba(255,255,255,.35)' }} />)}
          </Row>
        </LinearGradient>
      </View>
      {offline && <Card style={{ marginHorizontal: 20, backgroundColor: C.yellow }}><Txt size={14}>{t('offline')}</Txt></Card>}

      {/* 1. awareness */}
      {head(T('توعية', 'Health awareness'), T('معلومة قصيرة تفرق في صحتك', 'A short fact that makes a difference'))}
      <HScroll>
        {tips.map((x) => (
          <Pressable key={x.key} onPress={() => setTip(x)} accessibilityRole="button" style={[s.tip, { backgroundColor: x.c }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={[s.tipIcon]}><Icon d={x.icon} size={18} color={x.ink} /></View>
              {x.screening === plan?.screening && <View style={[s.tag, { backgroundColor: C.white }]}><Txt size={10} weight="800" color={x.ink}>{T('يخصّك', 'For you')}</Txt></View>}
            </Row>
            <Txt size={11} weight="700" color={x.ink} style={{ marginTop: 10 }}>{L(x.tag, lang)}</Txt>
            <Txt size={16} weight="800" lines={2}>{L(x.title, lang)}</Txt>
            <Txt size={12} color={C.inkSoft} lines={2}>{L(x.facts[0], lang)}</Txt>
          </Pressable>
        ))}
      </HScroll>

      {/* 2. what's new in the district */}
      {head(T('جديد في حيّك', 'New in your district'), me ? T(`فعاليات صحية قريبة منك في ${me.district_ar}`, `Health events near you in ${me.district_en}`) : undefined)}
      {challenge && (
        <Card style={{ marginHorizontal: 20, marginBottom: 10, backgroundColor: '#E5F3FC', gap: 6 }} onPress={() => router.push('/game')}>
          <Row gap={8}><Icon d={ICON.shield} size={17} color={C.teal} /><Txt size={12} weight="700" color={C.teal}>{T('من وزارة الصحة لحيّك', 'From the Ministry for your district')}</Txt></Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={16} weight="800">{pick(challenge as never, 'title')}</Txt><Txt size={14} weight="800" color={C.teal}>{challenge.progress}/{challenge.goal}</Txt></Row>
          <View style={s.track}><View style={[s.fill, { width: `${(challenge.progress ?? 0) / (challenge.goal || 1) * 100}%` }]} /></View>
          <Txt size={12} color={C.inkSoft}>{T('كل موعد ومشي ومساعدة جار في «حيّ عون» تحسب للحي', 'Every booking, walk and neighbour helped counts for the district')}</Txt>
        </Card>
      )}
      <HScroll>
        {events.map((e) => { const st = EV_STYLE[e.kind] ?? EV_STYLE.talk;
          return (
            <Pressable key={e.id} onPress={() => setEv(e)} accessibilityRole="button" style={s.event}>
              <View style={[s.evTop, { backgroundColor: st[0] }]}>
                <View style={s.date}>
                  <Txt size={11} weight="700" color={st[1]} center>{when(e.start, locale, { weekday: 'short' })}</Txt>
                  <Txt size={20} weight="800" color={st[1]} center>{when(e.start, locale, { day: 'numeric' })}</Txt>
                </View>
                <View style={[s.evIcon, { backgroundColor: C.white }]}><Icon d={st[2]} size={22} color={st[1]} /></View>
              </View>
              <View style={{ padding: 12, gap: 3 }}>
                <Txt size={15} weight="800" lines={2}>{pick(e as never, 'title')}</Txt>
                <Row gap={4}><Icon d={ICON.pin} size={13} color={C.muted} /><Txt size={12} color={C.inkSoft} lines={1} style={{ flex: 1 }}>{pick(e as never, 'place')}</Txt></Row>
                <Row gap={4}><Icon d={ICON.clock ?? ICON.calendar} size={13} color={C.muted} /><Txt size={12} color={C.inkSoft}>{when(e.start, locale, { hour: 'numeric', minute: '2-digit' })}</Txt></Row>
                <View style={[s.tag, { backgroundColor: st[0], alignSelf: 'flex-start', marginTop: 4 }]}><Txt size={11} weight="700" color={st[1]}>{e.free ? T('مجاني', 'Free') : ''} · {pick(e as never, 'who')}</Txt></View>
              </View>
            </Pressable>
          ); })}
        {!events.length && <Card style={{ width: 260 }}><Txt size={14} color={C.muted}>{T('ما فيه فعاليات هالأسبوع.', 'No events this week.')}</Txt></Card>}
      </HScroll>

      {/* 3. the plan, one line + the visit */}
      {head(T('خطتك', 'Your plan'), T(`${doneN} من ${steps.length} خطوات`, `${doneN} of ${steps.length} steps`))}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ gap: 12 }} onPress={() => router.push('/care')}>
          <View style={{ height: 34, justifyContent: 'center' }}>
            <View style={s.line}><View style={[s.lineFill, { width: `${Math.max(0, doneN - 1) / (steps.length - 1) * 100}%`, alignSelf: rtl ? 'flex-end' : 'flex-start' }]} /></View>
            <Row style={{ justifyContent: 'space-between', position: 'absolute', left: 0, right: 0 }}>
              {steps.map((x, i) => (
                <View key={i} style={[s.node, x.done ? { backgroundColor: C.teal, borderColor: C.teal } : next === x ? { borderColor: C.teal } : null]}>
                  {x.done ? <Icon d={ICON.check} size={13} color={C.white} width={3} /> : <Txt size={11} weight="800" color={next === x ? C.teal : C.muted}>{i + 1}</Txt>}
                </View>
              ))}
            </Row>
          </View>
          <Row style={{ justifyContent: 'space-between' }}>
            {steps.map((x, i) => <Txt key={i} size={11} weight={next === x ? '800' : '600'} color={x.done || next === x ? C.ink : C.muted} center style={{ width: 60 }}>{x.label}</Txt>)}
          </Row>
          <Row gap={8} style={{ backgroundColor: C.mintSoft, borderRadius: 14, padding: 10 }}>
            <Icon d={ICON.spark ?? ICON.check} size={16} color={C.teal} /><Txt size={13} weight="700" style={{ flex: 1 }}>{nextText}</Txt>
          </Row>
        </Card>

        <LinearGradient colors={GRAD.apptCard} style={s.appt}>
          {slot ? (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} weight="700" color={C.teal}>{plan!.confirmed ? '✓ ' + t('confirmed') : T('موعد مقترح', 'Suggested visit')}</Txt>
                {slot.cost && <View style={[s.tag, { backgroundColor: C.white }]}><Txt size={11} weight="800" color={C.teal}>{slot.cost.free ? T('مجاني · صحتي', 'Free · Sehhaty') : t('youPay', { n: slot.cost.you_pay })}</Txt></View>}
              </Row>
              <Txt size={24} weight="800">{when(slot.iso, locale, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</Txt>
              <Txt size={14} color={C.inkSoft}>{when(slot.iso, locale, { day: 'numeric', month: 'long' })} · {lang === 'ar' ? plan!.screening_ar : plan!.screening_en}</Txt>
              <View style={s.dash} />
              <Row gap={8}><Icon d={ICON.pin} size={16} color={C.inkSoft} /><Txt size={14} style={{ flex: 1 }} lines={1}>{placeName(slot, t, lang)}</Txt></Row>
              {slot.doctor && <Row gap={8}><Icon d={ICON.people} size={16} color={C.inkSoft} /><Txt size={14} style={{ flex: 1 }} lines={1}>{pick(slot.doctor as never, 'name')}</Txt></Row>}
              <Row gap={8} style={{ marginTop: 10 }}>
                <View style={{ flex: 1 }}><Button title={t('viewPlan')} onPress={() => router.push('/plan')} /></View>
                {slot.kind !== 'home_visit' && <View style={{ flex: 1 }}><Button title={plan?.ride ? T('التوصيل', 'Your ride') : T('كيف أوصل', 'Getting there')} tone="ghost" onPress={() => router.push('/map')} icon={<Icon d={ICON.car} size={16} />} /></View>}
              </Row>
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <Txt size={20} weight="800">{t('noBooking')}</Txt>
              <Txt size={14} color={C.inkSoft}>{plan ? (lang === 'ar' ? plan.screening_ar : plan.screening_en) : ''}</Txt>
              <Button title={t('pickTime')} onPress={() => router.push('/booking')} icon={<Icon d={ICON.calendar} color={C.white} size={16} />} />
              {me?.calls_ok !== false && <Button title={t('bookAppt')} tone="ghost" onPress={() => router.push('/incoming')} icon={<Icon d={ICON.phone} size={16} />} />}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* 4. my care */}
      {head(t('myCare'))}
      <View style={[s.grid, { flexDirection: rtl ? 'row-reverse' : 'row' }]} onLayout={(e) => setGridW(e.nativeEvent.layout.width - 40)}>
        {tiles.map((tile) => (
          <Pressable key={tile.key} onPress={() => router.push(tile.to as never)} accessibilityRole="button"
            style={[s.tile, { backgroundColor: tile.bg, width: tile.wide ? gridW || '100%' : tileW ?? '47%' }]}>
            {tile.wide && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none"><Skyline width="100%" height={70} opacity={0.75} /></View>}
            <Row style={{ justifyContent: 'space-between' }}>
              <Circle size={40}><Icon d={tile.icon} size={19} /></Circle>
              <Icon d={ICON.diag} size={16} color={C.inkSoft} />
            </Row>
            <View style={{ marginTop: 16 }}>
              <Txt size={17} weight="800">{tile.title}</Txt>
              <Txt size={12} color={C.inkSoft} lines={2}>{tile.sub}</Txt>
            </View>
            {tile.wide && <View style={{ height: 34 }} />}
          </Pressable>
        ))}
      </View>

      {/* awareness detail */}
      <Modal visible={!!tip} transparent animationType="slide" onRequestClose={() => setTip(null)}>
        <Pressable style={s.scrim} onPress={() => setTip(null)} />
        {tip && (
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={[s.tipIcon, { width: 52, height: 52, borderRadius: 26, backgroundColor: tip.c }]}><Icon d={tip.icon} size={24} color={tip.ink} /></View>
            <Txt size={12} weight="700" color={tip.ink}>{L(tip.tag, lang)}</Txt>
            <Txt size={22} weight="800">{L(tip.title, lang)}</Txt>
            {tip.facts.map((f, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}><View style={[s.bullet, { backgroundColor: tip.ink }]} /><Txt size={15} style={{ flex: 1 }}>{L(f, lang)}</Txt></Row>
            ))}
            <Row gap={8} style={{ marginTop: 6 }}>
              <View style={{ flex: 1 }}><Button title={T('اسمعيها', 'Listen')} tone="ghost" onPress={() => say([L(tip.title, lang), ...tip.facts.map((f) => L(f, lang))].join('. '))} icon={<Icon d={ICON.mic} size={16} />} /></View>
              {tip.screening && <View style={{ flex: 1 }}><Button title={T('احجزي فحصك', 'Book a check')} onPress={() => { setTip(null); router.push('/booking'); }} /></View>}
            </Row>
            <Txt size={11} color={C.muted}>{T('معلومات عامة من برامج الكشف المبكر. طبيبك يحدد اللي يناسبك.', 'General early-screening guidance. Your doctor decides what suits you.')}</Txt>
          </View>
        )}
      </Modal>

      {/* event detail */}
      <Modal visible={!!ev} transparent animationType="slide" onRequestClose={() => setEv(null)}>
        <Pressable style={s.scrim} onPress={() => setEv(null)} />
        {ev && (() => { const st = EV_STYLE[ev.kind] ?? EV_STYLE.talk;
          return (
            <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={[s.tipIcon, { width: 52, height: 52, borderRadius: 26, backgroundColor: st[0] }]}><Icon d={st[2]} size={24} color={st[1]} /></View>
              <Txt size={22} weight="800">{pick(ev as never, 'title')}</Txt>
              <Row gap={8}><Icon d={ICON.calendar} size={16} color={C.inkSoft} /><Txt size={15}>{when(ev.start, locale, { weekday: 'long', day: 'numeric', month: 'long' })} · {when(ev.start, locale, { hour: 'numeric', minute: '2-digit' })} – {when(ev.end, locale, { hour: 'numeric', minute: '2-digit' })}</Txt></Row>
              <Row gap={8}><Icon d={ICON.pin} size={16} color={C.inkSoft} /><Txt size={15} style={{ flex: 1 }}>{pick(ev as never, 'place')}</Txt></Row>
              <Row gap={8}><Icon d={ICON.people} size={16} color={C.inkSoft} /><Txt size={15} style={{ flex: 1 }}>{pick(ev as never, 'who')}{ev.free ? T(' · مجاني', ' · free') : ''}</Txt></Row>
              <Row gap={8} style={{ marginTop: 6 }}>
                <View style={{ flex: 1 }}><Button title={T('الاتجاهات', 'Directions')} tone="ghost" icon={<Icon d={ICON.map} size={16} />}
                  onPress={() => Linking.openURL(Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${ev.lat},${ev.lon}` : `https://www.google.com/maps/dir/?api=1&destination=${ev.lat}%2C${ev.lon}`)} /></View>
                {ev.bookable
                  ? <View style={{ flex: 1 }}><Button title={T('احجزي موعد', 'Book a time')} onPress={() => { setEv(null); router.push('/booking'); }} /></View>
                  : <View style={{ flex: 1 }}><Button title={T('اسمعيها', 'Listen')} onPress={() => say([pick(ev as never, 'title'), pick(ev as never, 'place'), pick(ev as never, 'who')].join('. '))} icon={<Icon d={ICON.mic} size={16} color={C.white} />} /></View>}
              </Row>
            </View>
          ); })()}
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.tealMid },
  bar: { backgroundColor: C.white, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  hero: { padding: 20, paddingTop: 22, gap: 6, overflow: 'hidden', minHeight: 230 },
  heroMark: { position: 'absolute', width: 260, height: 260, left: -40, top: -10, opacity: 0.09 },
  heroBtn: { backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  heroArrow: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(89,194,249,.28)', alignItems: 'center', justifyContent: 'center' },
  tip: { width: 210, borderRadius: 22, padding: 14, gap: 3 },
  tipIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.85)', alignItems: 'center', justifyContent: 'center' },
  tag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  event: { width: 230, borderRadius: 22, backgroundColor: C.white, overflow: 'hidden' },
  evTop: { height: 84, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { backgroundColor: C.white, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, minWidth: 50 },
  evIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.white, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.tealMid, borderRadius: 4 },
  line: { height: 4, borderRadius: 2, backgroundColor: C.line, marginHorizontal: 14 },
  lineFill: { height: 4, borderRadius: 2, backgroundColor: C.teal },
  node: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  appt: { borderRadius: R.card, padding: 18, gap: 4 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(14,46,69,.25)', marginVertical: 10 },
  grid: { flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  tile: { borderRadius: 24, padding: 14, minHeight: 124, overflow: 'hidden' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,35,54,.35)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 10 },
  bullet: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
});
