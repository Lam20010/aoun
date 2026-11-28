// Open times across the city: health centers, Ministry hospitals, mobile clinics, home visits, and (if
// wanted) private clinics and hospitals. One fetch, then every filter works instantly on the phone.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Button, Card, Pill, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { HScroll } from '../src/ui/HScroll';
import { C, R } from '../src/theme';
import { useT, when } from '../src/i18n';
import { useApp } from '../src/store';
import { api, ApiError, refresh } from '../src/api';
import { placeName } from '../src/data/plan';
import { scheduleAll } from '../src/notify';
import type { Slot } from '../src/types';

type Place = 'any' | 'phc' | 'hospital' | 'mobile' | 'home' | 'private';
type Time = 'any' | 'morning' | 'noon' | 'evening' | 'late';
type Days = 'any' | 'weekday' | 'weekend';
type Cost = 'any' | 'free' | 'insured';
type Sort = 'soon' | 'cheap' | 'near';
interface Facility { id: string; kind: string; district: string; district_ar: string; district_en: string; name_ar: string; name_en: string; lat: number; lon: number; paid: boolean }
interface F { area: string; place: Place; facility: string | null; time: Time; days: Days; cost: Cost; female: boolean; wheelchair: boolean; sort: Sort }

const local = (s: Slot) => new Date(new Date(s.iso).getTime() + 3 * 3600000);
const placeOf = (s: Slot): Place => s.kind === 'mobile_clinic' ? 'mobile' : s.kind === 'home_visit' ? 'home'
  : s.facility_kind === 'hospital' ? 'hospital' : s.facility_kind === 'private_clinic' || s.facility_kind === 'private_hospital' ? 'private' : 'phc';
const KIND_ICON: Record<Place, string> = { any: ICON.pin, phc: ICON.plus, hospital: 'M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2M7 3h4', mobile: ICON.car, home: ICON.home, private: ICON.shield };
const KIND_BG: Record<Place, string> = { any: C.mintSoft, phc: C.mintSoft, hospital: '#E1E8F3', mobile: '#EEF2D2', home: C.yellow, private: '#FBEBD5' };
const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * 0.91) * 111;
const BASE: F = { area: 'mine', place: 'any', facility: null, time: 'any', days: 'any', cost: 'any', female: false, wheelchair: false, sort: 'soon' };

export default function Booking() {
  const { t, rtl, lang, locale, pick } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const insets = useSafeAreaInsets();
  const me = useApp((s) => s.me);
  const [districts, setDistricts] = useState<{ key: string; ar: string; en: string }[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  useEffect(() => { api.catalog().then((c) => { setDistricts(c.districts ?? []); setFacilities((c as unknown as { facilities?: Facility[] }).facilities ?? []); }).catch(() => {}); }, []);
  const [f, setF] = useState<F>(BASE);
  const [draft, setDraft] = useState<F>(BASE);
  const [sheet, setSheet] = useState(false);
  const [femaleSet, setFemaleSet] = useState(false);
  // Women see women doctors first; they can switch it off.
  useEffect(() => { if (me && !femaleSet) { setF((x) => ({ ...x, female: me.gender === 'f' })); setFemaleSet(true); } }, [me, femaleSet]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setSlots(null);
    api.slots({ days: 14, district: 'all', private: true }).then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const home = useMemo(() => facilities.find((x) => x.kind === 'phc' && x.district === me?.district), [facilities, me?.district]);
  const match = useCallback((s: Slot, x: F) => {
    const area = x.area === 'mine' ? me?.district : x.area;
    const pl = placeOf(s);
    if (x.facility) { if (s.facility_id !== x.facility) return false; }
    else {
      // Hospitals and private places serve the whole city, so they are not limited to one district.
      if (area !== 'all' && s.district !== area && !(x.place === 'private' || x.place === 'hospital')) return false;
      if (x.place !== 'any' && pl !== x.place) return false;
      if (x.place === 'any' && pl === 'private') return false;   // paid places only when asked for
    }
    const h = local(s).getUTCHours(), w = local(s).getUTCDay();
    if (x.time === 'morning' && h >= 12) return false;
    if (x.time === 'noon' && (h < 12 || h >= 16)) return false;
    if (x.time === 'evening' && (h < 16 || h >= 20)) return false;
    if (x.time === 'late' && h < 20) return false;
    if (x.days === 'weekday' && (w === 5 || w === 6)) return false;
    if (x.days === 'weekend' && !(w === 5 || w === 6)) return false;
    if (x.cost === 'free' && !s.cost?.free) return false;
    if (x.cost === 'insured' && !(s.cost?.free || s.cost?.basis === 'insurance')) return false;
    if (x.female && !s.female_staff) return false;
    if (x.wheelchair && !s.wheelchair) return false;
    return true;
  }, [me?.district]);

  const filtered = useMemo(() => (slots ?? []).filter((s) => match(s, f)), [slots, f, match]);
  const dayKey = (s: Slot) => local(s).toISOString().slice(0, 10);
  const days = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((s) => m.set(dayKey(s), (m.get(dayKey(s)) ?? 0) + 1));
    return Array.from(m.entries());
  }, [filtered]);
  useEffect(() => { if (days.length && (!day || !days.some(([d]) => d === day))) setDay(days[0][0]); }, [days, day]);
  const shown = useMemo(() => {
    const list = filtered.filter((s) => dayKey(s) === day);
    if (f.sort === 'cheap') return [...list].sort((a, b) => (a.cost?.you_pay ?? 0) - (b.cost?.you_pay ?? 0) || a.iso.localeCompare(b.iso));
    if (f.sort === 'near' && home) return [...list].sort((a, b) => km(a, home) - km(b, home) || a.iso.localeCompare(b.iso));
    return list;
  }, [filtered, day, f.sort, home]);
  const draftCount = useMemo(() => (slots ?? []).filter((s) => match(s, draft)).length, [slots, draft, match]);

  const n = [f.area !== 'mine', f.place !== 'any', !!f.facility, f.time !== 'any', f.days !== 'any', f.cost !== 'any', f.female, f.wheelchair, f.sort !== 'soon'].filter(Boolean).length;
  const areaLabel = (() => {
    if (f.facility) { const fc = facilities.find((x) => x.id === f.facility); return fc ? pick(fc as never, 'name') : ''; }
    if (f.place === 'hospital') return T('مستشفيات وزارة الصحة', 'Ministry hospitals');
    if (f.place === 'private') return T('العيادات والمستشفيات الخاصة', 'Private clinics and hospitals');
    if (f.area === 'all') return T('كل الرياض', 'All of Riyadh');
    const d = districts.find((x) => x.key === (f.area === 'mine' ? me?.district : f.area));
    return d ? (lang === 'ar' ? 'حي ' + d.ar : d.en) + (f.area === 'mine' ? T(' · حيّي', ' · my district') : '') : '…';
  })();

  useReadable([t('bookingTitle'), areaLabel, ...shown.slice(0, 6).map((s) => when(s.iso, locale, { hour: 'numeric', minute: '2-digit' }) + '، ' + placeName(s, t, lang) + (s.doctor ? '، ' + pick(s.doctor as never, 'name') : ''))]);

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

  // quick toggles, one scrolling row
  const quick: { key: string; label: string; on: boolean; flip: () => void }[] = [
    { key: 'female', label: T('طبيبة', 'Woman doctor'), on: f.female, flip: () => setF({ ...f, female: !f.female }) },
    { key: 'free', label: T('مجاني', 'Free'), on: f.cost === 'free', flip: () => setF({ ...f, cost: f.cost === 'free' ? 'any' : 'free' }) },
    { key: 'morning', label: T('الصبح', 'Morning'), on: f.time === 'morning', flip: () => setF({ ...f, time: f.time === 'morning' ? 'any' : 'morning' }) },
    { key: 'late', label: T('بعد الدوام', 'After work'), on: f.time === 'late', flip: () => setF({ ...f, time: f.time === 'late' ? 'any' : 'late' }) },
    { key: 'weekend', label: T('الجمعة والسبت', 'Weekend'), on: f.days === 'weekend', flip: () => setF({ ...f, days: f.days === 'weekend' ? 'any' : 'weekend' }) },
    { key: 'hospital', label: T('مستشفيات', 'Hospitals'), on: f.place === 'hospital', flip: () => setF({ ...f, place: f.place === 'hospital' ? 'any' : 'hospital', facility: null }) },
    { key: 'wheel', label: T('كرسي متحرك', 'Wheelchair'), on: f.wheelchair, flip: () => setF({ ...f, wheelchair: !f.wheelchair }) },
    { key: 'private', label: T('خاص', 'Private'), on: f.place === 'private', flip: () => setF({ ...f, place: f.place === 'private' ? 'any' : 'private', facility: null }) },
  ];

  const facList = facilities.filter((x) => draft.place === 'any' ? !x.paid : draft.place === 'private' ? x.paid : draft.place === 'hospital' ? x.kind === 'hospital' : draft.place === 'phc' ? x.kind === 'phc' : false);
  const opt = <V extends string>(value: V, items: [V, string][], onPick: (v: V) => void) => (
    <View style={s.grid}>
      {items.map(([k, label]) => { const on = value === k;
        return (
          <Pressable key={k} onPress={() => onPick(k)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={[s.opt, { backgroundColor: on ? C.dark : C.white, borderColor: on ? C.dark : C.line }]}>
            <Txt size={13} weight="700" color={on ? C.white : C.ink} center lines={1}>{label}</Txt>
          </Pressable>
        ); })}
    </View>
  );
  const section = (title: string, body: React.ReactNode) => (
    <View style={{ gap: 8 }}><Txt size={14} weight="800" color={C.inkSoft}>{title}</Txt>{body}</View>
  );

  return (
    <Screen title={t('bookingTitle')}>
      {/* where + filters */}
      <Row gap={8}>
        <Pressable onPress={() => { setDraft(f); setSheet(true); }} style={[s.bar, { flex: 1 }]} accessibilityRole="button">
          <View style={[s.kind, { width: 36, height: 36, backgroundColor: C.mintSoft }]}><Icon d={ICON.pin} size={17} color={C.teal} /></View>
          <View style={{ flex: 1 }}>
            <Txt size={11} color={C.muted}>{T('وين تبين تفحصين؟', 'Where?')}</Txt>
            <Txt size={15} weight="800" lines={1}>{areaLabel}</Txt>
          </View>
          <Icon d="M6 9l6 6 6-6" size={16} color={C.muted} />
        </Pressable>
        <Pressable onPress={() => { setDraft(f); setSheet(true); }} style={[s.bar, { paddingHorizontal: 14 }]} accessibilityRole="button">
          <Icon d={ICON.sliders} size={18} />
          <Txt size={14} weight="800">{T('الفلاتر', 'Filters')}</Txt>
          {n > 0 && <View style={s.badge}><Txt size={11} weight="800" color={C.white} center>{n}</Txt></View>}
        </Pressable>
      </Row>

      <HScroll gap={8} style={{ marginHorizontal: -20 }}>
        {quick.map((q) => (
          <Pressable key={q.key} onPress={q.flip} accessibilityRole="switch" accessibilityState={{ checked: q.on }}
            style={[s.chip, { backgroundColor: q.on ? C.tealMid : C.white, borderColor: q.on ? C.tealMid : C.line }]}>
            {q.on && <Icon d={ICON.check} size={13} color={C.dark} width={2.6} />}
            <Txt size={13} weight="700" color={q.on ? C.dark : C.ink}>{q.label}</Txt>
          </Pressable>
        ))}
      </HScroll>

      <HScroll gap={8} style={{ marginHorizontal: -20 }}>
        {days.map(([d, count]) => {
          const on = d === day, iso = d + 'T12:00:00+03:00';
          return (
            <Pressable key={d} onPress={() => setDay(d)} style={[s.day, on && { backgroundColor: C.dark }]}>
              <Txt size={12} color={on ? 'rgba(255,255,255,.75)' : C.muted} center>{when(iso, locale, { weekday: 'short' })}</Txt>
              <Txt size={19} weight="800" color={on ? C.white : C.ink} center>{when(iso, locale, { day: 'numeric' })}</Txt>
              <View style={[s.count, { backgroundColor: on ? C.mint : C.mintSoft }]}><Txt size={10} weight="800" center>{count}</Txt></View>
            </Pressable>
          );
        })}
      </HScroll>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt size={14} weight="700" color={C.inkSoft}>{slots === null ? '' : T(`${shown.length} موعد في هذا اليوم`, `${shown.length} times this day`)}</Txt>
        <Pressable onPress={() => setF({ ...f, sort: f.sort === 'soon' ? 'near' : f.sort === 'near' ? 'cheap' : 'soon' })} accessibilityRole="button">
          <Row gap={4}><Icon d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" size={15} color={C.teal} />
            <Txt size={13} weight="700" color={C.teal}>{{ soon: T('الأقرب وقتًا', 'Soonest'), near: T('الأقرب للبيت', 'Nearest'), cheap: T('الأقل تكلفة', 'Cheapest') }[f.sort]}</Txt></Row>
        </Pressable>
      </Row>

      {slots === null && <ActivityIndicator color={C.teal} />}
      {slots !== null && !shown.length && (
        <Card style={{ gap: 10 }}>
          <Txt size={15} color={C.inkSoft}>{T('ما فيه مواعيد بهالفلاتر. جرّبي توسّعين المنطقة أو الوقت.', 'No times match. Try a wider area or time.')}</Txt>
          <Button title={T('امسحي الفلاتر', 'Clear filters')} tone="ghost" onPress={() => setF(BASE)} />
        </Card>
      )}
      {shown.map((sl) => { const pl = placeOf(sl);
        return (
          <Card key={sl.id} onPress={busy ? undefined : () => book(sl)} style={{ gap: 10 }}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={[s.kind, { backgroundColor: KIND_BG[pl] }]}><Icon d={KIND_ICON[pl]} size={20} color={C.dark} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt size={20} weight="800" color={C.teal}>{when(sl.iso, locale, { hour: 'numeric', minute: '2-digit' })}</Txt>
                  <Txt size={12} color={C.muted}>{t('placesLeft', { n: sl.remaining })}</Txt>
                </Row>
                <Txt size={15} weight="700" lines={2}>{placeName(sl, t, lang)}</Txt>
                <Txt size={13} color={C.inkSoft}>{(lang === 'ar' ? 'حي ' + sl.district_ar : sl.district) + (home ? ' · ' + (km(sl, home) < 0.5 ? T('قريب منك', 'near you') : km(sl, home).toFixed(1) + T(' كم', ' km')) : '')}</Txt>
                {sl.doctor && <Txt size={13} color={C.inkSoft} lines={1}>{pick(sl.doctor as never, 'name')} · {pick(sl.doctor as never, 'clinic')}</Txt>}
              </View>
            </Row>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {sl.cost && <Pill text={sl.cost.free ? t('freeSehhaty') : t('youPay', { n: sl.cost.you_pay })} tone={sl.cost.free ? 'mint' : 'amber'} />}
              {sl.female_staff && <Pill text={t('femaleStaff')} tone="gray" />}
              {sl.wheelchair && <Pill text={t('wheelchair')} tone="gray" />}
            </Row>
          </Card>
        ); })}
      <View style={{ height: 20 }} />

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={s.scrim} onPress={() => setSheet(false)} accessibilityLabel={t('back')} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.grab} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={20} weight="800">{T('الفلاتر', 'Filters')}</Txt>
            <Pressable onPress={() => setDraft(BASE)} accessibilityRole="button"><Txt size={14} weight="700" color={C.teal}>{T('إعادة ضبط', 'Reset')}</Txt></Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
            {section(T('المنطقة', 'Area'), opt<string>(draft.area, [['mine', T('حيّي', 'My district')], ['all', T('كل الرياض', 'All Riyadh')],
              ...districts.filter((d) => d.key !== me?.district).map((d) => [d.key, lang === 'ar' ? d.ar : d.en] as [string, string])], (v) => setDraft({ ...draft, area: v, facility: null })))}
            {section(T('نوع المكان', 'Type of place'), opt<Place>(draft.place, [['any', T('الكل (مجاني)', 'All (free)')], ['phc', T('مركز صحي', 'Health center')],
              ['hospital', T('مستشفى حكومي', 'Ministry hospital')], ['mobile', T('عيادة متنقلة', 'Mobile clinic')], ['home', T('زيارة منزلية', 'Home visit')],
              ['private', T('خاص (مدفوع)', 'Private (paid)')]], (v) => setDraft({ ...draft, place: v, facility: null })))}
            {facList.length > 0 && section(T('مكان محدد', 'A specific place'), (
              <View style={{ gap: 6 }}>
                {[{ id: '', label: T('أي مكان', 'Any place'), sub: '' }, ...facList.map((x) => ({ id: x.id, label: pick(x as never, 'name'),
                  sub: (lang === 'ar' ? 'حي ' + x.district_ar : x.district_en) + ' · ' + (x.paid ? T('خاص', 'Private') : T('مجاني عبر صحتي', 'Free via Sehhaty')) }))].map((o) => {
                  const on = (draft.facility ?? '') === o.id;
                  return (
                    <Pressable key={o.id || 'any'} onPress={() => setDraft({ ...draft, facility: o.id || null })} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={[s.rowOpt, on && { borderColor: C.teal, backgroundColor: C.mintSoft }]}>
                      <View style={[s.radio, on && { borderColor: C.teal }]}>{on && <View style={s.radioIn} />}</View>
                      <View style={{ flex: 1 }}><Txt size={14} weight="700">{o.label}</Txt>{!!o.sub && <Txt size={12} color={C.muted}>{o.sub}</Txt>}</View>
                    </Pressable>
                  ); })}
              </View>
            ))}
            {section(T('الوقت', 'Time of day'), opt<Time>(draft.time, [['any', T('أي وقت', 'Any time')], ['morning', T('الصبح', 'Morning')], ['noon', T('الظهر', 'Midday')],
              ['evening', T('العصر والمغرب', 'Afternoon')], ['late', T('بعد ٨ بالليل', 'After 8 pm')]], (v) => setDraft({ ...draft, time: v })))}
            {section(T('الأيام', 'Days'), opt<Days>(draft.days, [['any', T('أي يوم', 'Any day')], ['weekday', T('أيام الأسبوع', 'Weekdays')], ['weekend', T('الجمعة والسبت', 'Fri and Sat')]], (v) => setDraft({ ...draft, days: v })))}
            {section(T('التكلفة', 'Cost'), opt<Cost>(draft.cost, [['any', T('الكل', 'All')], ['free', T('مجاني فقط', 'Free only')], ['insured', T('يغطيه تأميني', 'Insurance covers')]], (v) => setDraft({ ...draft, cost: v })))}
            {section(T('تفضيلاتك', 'Your preferences'), (
              <View style={s.toggles}>
                <Row style={{ justifyContent: 'space-between' }}><Txt size={14} weight="600">{T('طبيبة فقط', 'Woman doctor only')}</Txt>
                  <Switch value={draft.female} onValueChange={(v) => setDraft({ ...draft, female: v })} trackColor={{ true: C.teal, false: C.line }} /></Row>
                <View style={{ height: 1, backgroundColor: C.line }} />
                <Row style={{ justifyContent: 'space-between' }}><Txt size={14} weight="600">{T('يدعم الكرسي المتحرك', 'Wheelchair access')}</Txt>
                  <Switch value={draft.wheelchair} onValueChange={(v) => setDraft({ ...draft, wheelchair: v })} trackColor={{ true: C.teal, false: C.line }} /></Row>
              </View>
            ))}
            {section(T('الترتيب', 'Sort by'), opt<Sort>(draft.sort, [['soon', T('الأقرب وقتًا', 'Soonest')], ['near', T('الأقرب للبيت', 'Nearest')], ['cheap', T('الأقل تكلفة', 'Cheapest')]], (v) => setDraft({ ...draft, sort: v })))}
          </ScrollView>
          <Button title={T(`اعرضي ${draftCount} موعد`, `Show ${draftCount} times`)} onPress={() => { setF(draft); setSheet(false); }} />
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, minHeight: 60 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.teal, paddingHorizontal: 5, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: R.pill, borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 14 },
  day: { backgroundColor: C.white, borderRadius: 18, paddingVertical: 8, width: 62, alignItems: 'center', gap: 2 },
  count: { minWidth: 22, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  kind: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,35,54,.35)' },
  sheet: { maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 10, gap: 12 },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { width: '31.6%', borderRadius: 14, borderWidth: 1.5, paddingVertical: 11, paddingHorizontal: 6 },
  rowOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, padding: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  radioIn: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.teal },
  toggles: { backgroundColor: C.white, borderRadius: 16, padding: 12, gap: 10 },
});
