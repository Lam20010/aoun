// The rows shown for a plan (home card, plan screen, call), in the app language.
import { Linking, Platform } from 'react-native';
import { when, type Key, type Lang } from '../i18n';
import type { Plan, Slot } from '../types';
import { ICON } from '../ui/Icon';

export interface Row { icon: string; text: string; accent?: boolean }
type T = (k: Key, v?: Record<string, string | number>) => string;
type Pick = (o: Record<string, unknown> | null | undefined, base: string) => string;

export function placeName(s: Slot, t: T, lang: Lang): string {
  if (s.kind === 'home_visit') return t('homeVisit');
  if (s.kind === 'mobile_clinic') return t('mobileClinic');
  return lang === 'ar' ? s.center_ar : s.center_en ?? s.center_ar;
}

export function planRows(p: Plan, t: T, pick: Pick, lang: Lang): Row[] {
  if (!p.slot) return [];
  const s = p.slot;
  const rows: Row[] = [
    { icon: ICON.doc, text: lang === 'ar' ? p.screening_ar : p.screening_en },
    { icon: ICON.pin, text: placeName(s, t, lang) + (s.kind === 'center' ? (lang === 'ar' ? ' · حي ' + s.district_ar : '') : '') },
  ];
  if (s.doctor) rows.push({ icon: ICON.people, text: pick(s.doctor as never, 'name') + ' · ' + pick(s.doctor as never, 'clinic') });
  if (p.ride && s.kind !== 'home_visit') {
    rows.push({ icon: ICON.car, accent: true, text: p.ride.mode === 'metro' ? t('rideMetro') : t('rideCar', { t: pickupTime(s.iso, p.ride.pickup_minutes ?? 30, lang) }) });
  }
  if (p.prefs.includes('companion_reminders')) rows.push({ icon: ICON.people, text: t('companionOn') });
  const prefs = p.prefs.filter((x) => x === 'female_doctor' || x === 'wheelchair_center').map((x) => t(x === 'female_doctor' ? 'femaleStaff' : 'wheelchair'));
  if (prefs.length) rows.push({ icon: ICON.check, text: t('prefs') + ': ' + prefs.join('، ') });
  return rows;
}

export function pickupTime(iso: string, minutes: number, lang: Lang): string {
  const d = new Date(new Date(iso).getTime() - minutes * 60000);
  return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' });
}

export function slotWhen(s: Slot, locale: string) {
  return when(s.iso, locale);
}

// ---------- getting there ----------
// Google Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
// Uber universal link: https://developer.uber.com/docs/deep-linking
// Darb (Royal Commission for Riyadh City) has no public deep link, so it opens its store page.

export function googleDirections(s: Slot, mode: 'driving' | 'transit' | 'walking' = 'driving') {
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${s.lat}%2C${s.lon}&travelmode=${mode}`);
}

export function uberTo(s: Slot, name: string) {
  const q = `action=setPickup&pickup=my_location&dropoff[latitude]=${s.lat}&dropoff[longitude]=${s.lon}&dropoff[nickname]=${encodeURIComponent(name)}`;
  return Linking.openURL(`https://m.uber.com/ul/?${q}`);
}

export function openDarb() {
  return Linking.openURL(Platform.OS === 'ios'
    ? 'https://apps.apple.com/sa/app/id1549817739'
    : 'https://play.google.com/store/apps/details?id=com.rcrc.riyadhjourneyplanner');
}
