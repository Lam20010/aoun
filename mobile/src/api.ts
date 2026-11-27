// Calls to the Aoun server. Only a short-lived demo key travels; no personal data.
import { API_BASE } from './config';
import type { Plan, Ride } from './store';

async function req<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(API_BASE + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
  return r.json() as Promise<T>;
}

export const api = {
  start: (voice: string, lang: string) => req<{ k: string }>('/demo/start', { voice, lang }),
  bind: (k: string, conversationId: string) => req('/demo/bind', { k, conversation_id: conversationId }),
  status: (k: string) => req<{ location: 'idle' | 'asked' | 'allowed' | 'refused' }>('/demo/status?k=' + encodeURIComponent(k)),
  location: (k: string, allow: boolean, lat?: number, lon?: number) =>
    req('/demo/location', lat === undefined ? { k, allow } : { k, allow, lat, lon }),
  plan: (k: string) => req<ServerPlan>('/demo/plan?k=' + encodeURIComponent(k)),
};

interface ServerPlan {
  confirmed: boolean;
  slot: { kind: string; iso: string } | null;
  ride: { mode: string; party?: string; pickup_minutes?: number } | null;
  prefs: string[];
}

const PREF_AR: Record<string, string> = { wheelchair_center: 'مركز يدعم الكرسي المتحرك', female_doctor: 'طبيبة' };

/** The server's booking, in the app's plan shape. */
export function toPlan(d: ServerPlan): Partial<Plan> | null {
  if (!d.slot) return null;
  const iso = d.slot.iso.slice(5, 16);
  const when: Plan['when'] = iso === '12-03T17:00' ? 'thu5' : iso.startsWith('12-06') ? 'sun' : iso.startsWith('12-09') ? 'wed' : iso.startsWith('12-05') ? 'sat' : 'thu';
  const p: Partial<Plan> = {
    when, place: d.slot.kind === 'home_visit' ? 'home' : d.slot.kind === 'mobile_clinic' ? 'mobile' : 'center',
    ride: '', rideAt: '4', prefs: [], companion: false, confirmed: d.confirmed,
  };
  if (d.ride) {
    p.ride = (d.ride.mode === 'metro' ? 'metro' : ({ alone: 'car', group: 'fam', wheelchair: 'wheel' } as Record<string, Ride>)[d.ride.party ?? ''] ?? 'car');
    p.rideAt = d.ride.pickup_minutes === 60 ? '330' : '4';
  }
  for (const c of d.prefs) {
    if (PREF_AR[c]) p.prefs!.push(PREF_AR[c]);
    if (c === 'companion_reminders') p.companion = true;
    if (c === 'home_test') { p.place = 'home'; p.ride = ''; }
  }
  return p;
}
